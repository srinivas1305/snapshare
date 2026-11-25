import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildSmartAlbums } from '@/lib/smart-albums';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const occasion = await prisma.occasion.findUnique({
      where: { accessCode: params.code },
      select: { id: true, isActive: true },
    });

    if (!occasion) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    if (!occasion.isActive) {
      return NextResponse.json({ error: 'This gallery is no longer active' }, { status: 403 });
    }

    const albums = await buildSmartAlbums(occasion.id);
    return NextResponse.json(albums);
  } catch (error) {
    console.error('Error loading gallery smart albums:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
