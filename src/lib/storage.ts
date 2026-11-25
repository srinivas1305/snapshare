import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const ORIGINALS_DIR = path.join(UPLOAD_DIR, 'originals');
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, 'thumbnails');
const LOGOS_DIR = path.join(UPLOAD_DIR, 'logos');

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 400;

const S3_BUCKET = process.env.S3_BUCKET_NAME;
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_ENDPOINT = process.env.S3_ENDPOINT;

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
    forcePathStyle: Boolean(process.env.S3_FORCE_PATH_STYLE === 'true'),
  });
}

export async function ensureUploadDirs() {
  if (!isS3Enabled) {
    await fs.mkdir(ORIGINALS_DIR, { recursive: true });
    await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
    await fs.mkdir(LOGOS_DIR, { recursive: true });
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
    const image = sharp(file).rotate();
    const metadata = await image.metadata();
    width = metadata.width || null;
    height = metadata.height || null;

    thumbnailBuffer = await image
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch (error) {
    console.error('Error generating thumbnail with sharp, fallback to original:', error);
    thumbnailBuffer = file;
  }

  if (isS3Enabled && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: originalKey,
        Body: file,
        ContentType: mimeType,
      })
    );
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      })
    );
  } else {
    await fs.writeFile(path.join(ORIGINALS_DIR, uniqueName), file);
    await fs.writeFile(path.join(THUMBNAILS_DIR, `thumb_${uniqueName}`), thumbnailBuffer);
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

/**
 * Save and normalize a studio brand logo (converted to crisp PNG <= 256px).
 */
export async function saveBrandLogo(file: Buffer): Promise<string> {
  await ensureUploadDirs();

  const uniqueName = `${uuidv4()}.png`;
  const logoKey = `logos/${uniqueName}`;

  const processed = await sharp(file)
    .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
    .png({ quality: 90 })
    .toBuffer();

  if (isS3Enabled && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: logoKey,
        Body: processed,
        ContentType: 'image/png',
      })
    );
  } else {
    await fs.writeFile(path.join(LOGOS_DIR, uniqueName), processed);
  }

  return logoKey;
}

export async function deleteSingleKey(relativePath: string | null | undefined) {
  if (!relativePath) return;
  try {
    if (isS3Enabled && s3Client) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET,
          Key: relativePath,
        })
      );
    } else {
      await fs.unlink(path.join(UPLOAD_DIR, relativePath)).catch(() => {});
    }
  } catch (error) {
    console.error('Error deleting key:', relativePath, error);
  }
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

  const fullPath = path.join(UPLOAD_DIR, relativePath);
  return await fs.readFile(fullPath);
}

export async function deletePhoto(originalPath: string, thumbnailPath: string | null) {
  await deleteSingleKey(originalPath);
  if (thumbnailPath) {
    await deleteSingleKey(thumbnailPath);
  }
}

export async function deletePhotos(
  photos: Array<{ originalPath: string; thumbnailPath: string | null }>
) {
  if (!photos || photos.length === 0) return;

  if (isS3Enabled && s3Client) {
    const keys: string[] = [];
    for (const p of photos) {
      if (p.originalPath) keys.push(p.originalPath);
      if (p.thumbnailPath) keys.push(p.thumbnailPath);
    }

    if (keys.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize);
        try {
          await s3Client.send(
            new DeleteObjectsCommand({
              Bucket: S3_BUCKET,
              Delete: {
                Objects: chunk.map((Key) => ({ Key })),
                Quiet: true,
              },
            })
          );
        } catch (err) {
          console.error('Error batch deleting objects from S3, falling back:', err);
          for (const key of chunk) {
            await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key })).catch(() => {});
          }
        }
      }
    }
  } else {
    for (const p of photos) {
      await deletePhoto(p.originalPath, p.thumbnailPath);
    }
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
