import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getOccasionAccess } from '@/lib/occasion-access';
import { buildSmartAlbums } from '@/lib/smart-albums';

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

    const albums = await buildSmartAlbums(params.id);
    return NextResponse.json(albums);
  } catch (error) {
    console.error('Error building smart albums:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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

    const body = await request.json();
    const { albumId, name, centroid, coverPhotoId } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Album name is required' }, { status: 400 });
    }

    if (albumId) {
      const existing = await prisma.smartAlbum.findFirst({
        where: { id: albumId, occasionId: params.id },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Smart album not found' }, { status: 404 });
      }
      const updated = await prisma.smartAlbum.update({
        where: { id: albumId },
        data: { name: name.trim() },
      });
      return NextResponse.json(updated);
    }

    if (!Array.isArray(centroid) || centroid.length !== 128) {
      return NextResponse.json({ error: 'Valid 128-d face centroid required' }, { status: 400 });
    }

    const created = await prisma.smartAlbum.create({
      data: {
        occasionId: params.id,
        name: name.trim(),
        type: 'PERSON',
        centroidDescriptor: JSON.stringify(centroid),
        coverPhotoId: coverPhotoId || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error saving smart album:', error);
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

    const access = await getOccasionAccess(params.id, session.user.id, session.user.email);
    if (!access) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const albumId = searchParams.get('albumId');
    if (!albumId) {
      return NextResponse.json({ error: 'Album ID is required' }, { status: 400 });
    }

    await prisma.smartAlbum.deleteMany({
      where: { id: albumId, occasionId: params.id },
    });

    return NextResponse.json({ message: 'Smart album name cleared' });
  } catch (error) {
    console.error('Error deleting smart album:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
