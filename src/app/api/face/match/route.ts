import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { extractFaces } from '@/lib/face-recognition';
import { recordViewEvent } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let accessCode = '';
    let selfieDescriptor: number[] | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      accessCode = body.accessCode;
      if (Array.isArray(body.descriptor) && body.descriptor.length === 128) {
        selfieDescriptor = body.descriptor;
      }
    } else {
      const formData = await request.formData();
      accessCode = formData.get('accessCode') as string;
      const descriptorJson = formData.get('descriptor') as string;

      if (descriptorJson) {
        try {
          const parsed = JSON.parse(descriptorJson);
          if (Array.isArray(parsed) && parsed.length === 128) {
            selfieDescriptor = parsed;
          }
        } catch { /* ignore */ }
      }

      if (!selfieDescriptor) {
        const selfie = formData.get('selfie') as File;
        if (selfie) {
          const selfieBuffer = Buffer.from(await selfie.arrayBuffer());
          const selfieFaces = await extractFaces(selfieBuffer);
          if (selfieFaces.length > 0) {
            selfieDescriptor = selfieFaces[0].descriptor;
          }
        }
      }
    }

    if (!accessCode) {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 });
    }

    if (!selfieDescriptor) {
      return NextResponse.json(
        { error: 'No face detected in the selfie. Please ensure your face is well-lit and facing the camera.' },
        { status: 400 }
      );
    }

    const occasion = await prisma.occasion.findUnique({
      where: { accessCode },
    });

    if (!occasion) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    if (!occasion.isActive) {
      return NextResponse.json({ error: 'This gallery is no longer active' }, { status: 403 });
    }

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

    const photoBestDistance = new Map<string, number>();
    const MATCH_THRESHOLD = 0.62;

    for (const stored of storedDescriptors) {
      try {
        const storedVec = JSON.parse(stored.descriptor) as number[];
        const dist = euclideanDistance(selfieDescriptor, storedVec);
        const sim = cosineSimilarity(selfieDescriptor, storedVec);

        if (dist <= MATCH_THRESHOLD || sim >= 0.80) {
          const existing = photoBestDistance.get(stored.photoId);
          if (existing === undefined || dist < existing) {
            photoBestDistance.set(stored.photoId, dist);
          }
        }
      } catch (err) {
        console.error('Error parsing stored descriptor:', err);
      }
    }

    const matchedPhotoIds = Array.from(photoBestDistance.keys());

    const matchedPhotos = await prisma.photo.findMany({
      where: {
        id: { in: matchedPhotoIds },
      },
    });

    matchedPhotos.sort((a, b) => {
      const distA = photoBestDistance.get(a.id) ?? Infinity;
      const distB = photoBestDistance.get(b.id) ?? Infinity;
      return distA - distB;
    });

    await recordViewEvent({
      occasionId: occasion.id,
      eventType: 'FACE_MATCH',
      request,
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
