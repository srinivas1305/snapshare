import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { extractFaces, findMatches } from '@/lib/face-recognition';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const selfie = formData.get('selfie') as File;
    const accessCode = formData.get('accessCode') as string;

    if (!selfie || !accessCode) {
      return NextResponse.json(
        { error: 'Selfie and access code are required' },
        { status: 400 }
      );
    }

    // Find the occasion
    const occasion = await prisma.occasion.findUnique({
      where: { accessCode },
    });

    if (!occasion) {
      return NextResponse.json(
        { error: 'Occasion not found' },
        { status: 404 }
      );
    }

    // Extract face descriptor from selfie
    const selfieBuffer = Buffer.from(await selfie.arrayBuffer());
    const selfieFaces = await extractFaces(selfieBuffer);

    if (selfieFaces.length === 0) {
      return NextResponse.json(
        { error: 'No face detected in the selfie. Please try again with a clear photo of your face.' },
        { status: 400 }
      );
    }

    // Get the primary face descriptor (largest face)
    const selfieDescriptor = selfieFaces[0].descriptor;

    // Get all face descriptors for this occasion's photos
    const storedDescriptors = await prisma.faceDescriptor.findMany({
      where: {
        photo: {
          occasionId: occasion.id,
        },
      },
      select: {
        photoId: true,
        descriptor: true,
      },
    });

    // Parse stored descriptors
    const parsedDescriptors = storedDescriptors.map((d) => ({
      photoId: d.photoId,
      descriptor: JSON.parse(d.descriptor) as number[],
    }));

    // Find matching photos
    const matchedPhotoIds = findMatches(selfieDescriptor, parsedDescriptors, 0.6);

    // Fetch matched photos
    const matchedPhotos = await prisma.photo.findMany({
      where: {
        id: { in: matchedPhotoIds },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      matches: matchedPhotos,
      totalPhotos: storedDescriptors.length,
      matchCount: matchedPhotos.length,
    });
  } catch (error) {
    console.error('Face match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
