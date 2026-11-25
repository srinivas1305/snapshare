import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { deletePhoto } from '@/lib/storage';
import { getOccasionAccess } from '@/lib/occasion-access';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photo = await prisma.photo.findUnique({
      where: { id: params.id },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const access = await getOccasionAccess(photo.occasionId, session.user.id, session.user.email);
    const canDelete =
      photo.uploadedById === session.user.id || access?.role === 'OWNER';

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deletePhoto(photo.originalPath, photo.thumbnailPath);
    await prisma.photo.delete({ where: { id: params.id } });

    return NextResponse.json({ message: 'Photo deleted' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
