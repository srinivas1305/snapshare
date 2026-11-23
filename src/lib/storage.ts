import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const ORIGINALS_DIR = path.join(UPLOAD_DIR, 'originals');
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, 'thumbnails');

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 400;

// S3 Configuration (Supports AWS S3, Cloudflare R2, Supabase Storage, MinIO)
const S3_BUCKET = process.env.S3_BUCKET_NAME;
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_ENDPOINT = process.env.S3_ENDPOINT; // e.g. https://<account_id>.r2.cloudflarestorage.com

const isS3Enabled = Boolean(S3_BUCKET && S3_ACCESS_KEY && S3_SECRET_KEY);

let s3Client: S3Client | null = null;
if (isS3Enabled) {
  s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT || undefined,
    credentials: {
      accessKeyId: S3_ACCESS_KEY!,
      secretAccessKey: S3_SECRET_KEY!,
    },
    // Required for some S3-compatible providers like MinIO or Cloudflare R2
    forcePathStyle: Boolean(process.env.S3_FORCE_PATH_STYLE === 'true'),
  });
}

export async function ensureUploadDirs() {
  if (!isS3Enabled) {
    await fs.mkdir(ORIGINALS_DIR, { recursive: true });
    await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
  }
}

export async function savePhoto(
  file: Buffer,
  originalName: string,
  mimeType: string
): Promise<{
  originalPath: string;
  thumbnailPath: string;
  fileName: string;
  fileSize: number;
  width: number | null;
  height: number | null;
}> {
  await ensureUploadDirs();

  const ext = path.extname(originalName) || '.jpg';
  const uniqueName = `${uuidv4()}${ext}`;
  const originalKey = `originals/${uniqueName}`;
  const thumbnailKey = `thumbnails/thumb_${uniqueName}`;

  let width: number | null = null;
  let height: number | null = null;
  let thumbnailBuffer: Buffer;

  try {
    const image = sharp(file);
    const metadata = await image.metadata();
    width = metadata.width || null;
    height = metadata.height || null;

    thumbnailBuffer = await image
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (error) {
    console.error('Error generating thumbnail with sharp, fallback to original:', error);
    thumbnailBuffer = file;
  }

  if (isS3Enabled && s3Client) {
    // Upload original to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: originalKey,
        Body: file,
        ContentType: mimeType,
      })
    );

    // Upload thumbnail to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      })
    );
  } else {
    // Local filesystem storage
    const originalLocalPath = path.join(ORIGINALS_DIR, uniqueName);
    const thumbnailLocalPath = path.join(THUMBNAILS_DIR, `thumb_${uniqueName}`);

    await fs.writeFile(originalLocalPath, file);
    await fs.writeFile(thumbnailLocalPath, thumbnailBuffer);
  }

  return {
    originalPath: originalKey,
    thumbnailPath: thumbnailKey,
    fileName: originalName,
    fileSize: file.length,
    width,
    height,
  };
}

export async function getPhotoBuffer(relativePath: string): Promise<Buffer> {
  if (isS3Enabled && s3Client) {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: relativePath,
      })
    );

    if (!response.Body) {
      throw new Error(`Empty body returned from S3 for key: ${relativePath}`);
    }

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  // Local filesystem
  const fullPath = path.join(UPLOAD_DIR, relativePath);
  return await fs.readFile(fullPath);
}

export async function deletePhoto(originalPath: string, thumbnailPath: string | null) {
  try {
    if (isS3Enabled && s3Client) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET,
          Key: originalPath,
        })
      );
      if (thumbnailPath) {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: thumbnailPath,
          })
        );
      }
    } else {
      await fs.unlink(path.join(UPLOAD_DIR, originalPath)).catch(() => {});
      if (thumbnailPath) {
        await fs.unlink(path.join(UPLOAD_DIR, thumbnailPath)).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Error deleting photo files:', error);
  }
}

export function getPhotoPath(relativePath: string): string {
  return path.join(UPLOAD_DIR, relativePath);
}

export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
