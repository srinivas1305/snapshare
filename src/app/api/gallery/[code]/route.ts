import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const occasion = await prisma.occasion.findUnique({
      where: { accessCode: params.code },
      include: {
        photos: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fileName: true,
            thumbnailPath: true,
            originalPath: true,
            fileSize: true,
            mimeType: true,
            width: true,
            height: true,
            createdAt: true,
          },
        },
        user: {
          select: {
            name: true,
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

    if (!occasion.isActive) {
      return NextResponse.json({ error: 'This gallery is no longer active' }, { status: 403 });
    }

    return NextResponse.json({
      id: occasion.id,
      name: occasion.name,
      description: occasion.description,
      date: occasion.date,
      photographerName: occasion.user.name,
      photoCount: occasion._count.photos,
      photos: occasion.photos,
    });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
