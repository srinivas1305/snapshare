import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photoId = params.id;
    const body = await request.json();
    const faces = body.faces;

    if (!Array.isArray(faces)) {
      return NextResponse.json({ error: 'Invalid faces array' }, { status: 400 });
    }

    // Verify ownership
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        uploadedById: (session.user as any).id,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Delete any old descriptors for this photo
    await prisma.faceDescriptor.deleteMany({
      where: { photoId },
    });

    // Insert new FaceNet descriptors
    if (faces.length > 0) {
      await prisma.faceDescriptor.createMany({
        data: faces.map((face: any) => ({
          descriptor: JSON.stringify(face.descriptor),
          x: Number(face.box?.x ?? 0),
          y: Number(face.box?.y ?? 0),
          width: Number(face.box?.width ?? 0),
          height: Number(face.box?.height ?? 0),
          photoId,
        })),
      });
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: { faceProcessed: true },
    });

    return NextResponse.json({
      message: `Indexed ${faces.length} face(s)`,
      faceCount: faces.length,
    });
  } catch (error) {
    console.error('Error updating faces:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
