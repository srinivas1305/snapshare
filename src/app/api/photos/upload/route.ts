import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { savePhoto } from '@/lib/storage';
import { extractFaces } from '@/lib/face-recognition';
import fs from 'fs/promises';
import path from 'path';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const occasionId = formData.get('occasionId') as string;
    const files = formData.getAll('photos') as File[];

    if (!occasionId) {
      return NextResponse.json({ error: 'Occasion ID is required' }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Verify occasion exists and user has access
    const occasion = await prisma.occasion.findFirst({
      where: {
        id: occasionId,
        userId: (session.user as any).id,
      },
    });

    if (!occasion) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    const uploadedPhotos = [];
    const errors = [];

    for (const file of files) {
      try {
        if (file.size > MAX_FILE_SIZE) {
          errors.push({ file: file.name, error: 'File too large (max 50MB)' });
          continue;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
        if (!allowedTypes.includes(file.type)) {
          errors.push({ file: file.name, error: 'Unsupported file type' });
          continue;
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const photoData = await savePhoto(buffer, file.name, file.type);

        const photo = await prisma.photo.create({
          data: {
            fileName: photoData.fileName,
            originalPath: photoData.originalPath,
            thumbnailPath: photoData.thumbnailPath,
            fileSize: photoData.fileSize,
            mimeType: file.type,
            width: photoData.width,
            height: photoData.height,
            occasionId,
            uploadedById: (session.user as any).id,
          },
        });

        // Process faces in background (don't await - let it happen async)
        processFaces(photo.id, buffer).catch((err) =>
          console.error(`Face processing failed for ${photo.id}:`, err)
        );

        uploadedPhotos.push(photo);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        errors.push({ file: file.name, error: 'Upload failed' });
      }
    }

    return NextResponse.json({
      uploaded: uploadedPhotos,
      errors,
      message: `${uploadedPhotos.length} photo(s) uploaded successfully`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processFaces(photoId: string, imageBuffer: Buffer) {
  try {
    const faces = await extractFaces(imageBuffer);
    
    if (faces.length > 0) {
      await prisma.faceDescriptor.createMany({
        data: faces.map((face) => ({
          descriptor: JSON.stringify(face.descriptor),
          x: face.box.x,
          y: face.box.y,
          width: face.box.width,
          height: face.box.height,
          photoId,
        })),
      });
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: { faceProcessed: true },
    });
  } catch (error) {
    console.error(`Face processing error for photo ${photoId}:`, error);
  }
}
