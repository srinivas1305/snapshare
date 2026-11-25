import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { deletePhotos, deleteSingleKey } from '@/lib/storage';
import { getOccasionAccess } from '@/lib/occasion-access';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await getOccasionAccess(params.id, session.user.id, session.user.email);
    if (!access) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    const occasion = await prisma.occasion.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        photos: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
        },
        collaborators: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { photos: true },
        },
      },
    });

    if (!occasion) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...occasion,
      role: access.role,
    });
  } catch (error) {
    console.error('Error fetching occasion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await getOccasionAccess(params.id, session.user.id, session.user.email);
    if (!access || access.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only the occasion owner can update settings' }, { status: 403 });
    }

    const body = await request.json();

    const updated = await prisma.occasion.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(body.date !== undefined ? { date: new Date(body.date) } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        ...(body.brandName !== undefined ? { brandName: body.brandName?.trim() || null } : {}),
        ...(body.accentColor !== undefined ? { accentColor: body.accentColor || '#18181b' } : {}),
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl?.trim() || null } : {}),
        ...(body.photographerBio !== undefined ? { photographerBio: body.photographerBio?.trim() || null } : {}),
        ...(body.slideshowEnabled !== undefined ? { slideshowEnabled: Boolean(body.slideshowEnabled) } : {}),
        ...(body.slideshowInterval !== undefined
          ? { slideshowInterval: Math.max(2, Math.min(60, Number(body.slideshowInterval) || 5)) }
          : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating occasion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const occasion = await prisma.occasion.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        photos: {
          select: {
            originalPath: true,
            thumbnailPath: true,
          },
        },
      },
    });

    if (!occasion) {
      return NextResponse.json({ error: 'Occasion not found or unauthorized' }, { status: 404 });
    }

    if (occasion.photos.length > 0) {
      await deletePhotos(occasion.photos);
    }

    if (occasion.logoUrl && occasion.logoUrl.startsWith('logos/')) {
      await deleteSingleKey(occasion.logoUrl);
    }

    await prisma.occasion.delete({
      where: { id: occasion.id },
    });

    return NextResponse.json({ message: 'Occasion and all associated photos deleted' });
  } catch (error) {
    console.error('Error deleting occasion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
