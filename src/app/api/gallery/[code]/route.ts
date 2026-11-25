import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const afterParam = searchParams.get('after');
    const afterDate = afterParam ? new Date(afterParam) : null;

    const occasion = await prisma.occasion.findUnique({
      where: { accessCode: params.code },
      include: {
        photos: {
          where:
            afterDate && !isNaN(afterDate.getTime())
              ? { createdAt: { gt: afterDate } }
              : undefined,
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
            uploadedBy: {
              select: { name: true },
            },
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
      accessCode: occasion.accessCode,
      photographerName: occasion.brandName || occasion.user.name,
      brandName: occasion.brandName,
      accentColor: occasion.accentColor || '#18181b',
      logoUrl: occasion.logoUrl,
      photographerBio: occasion.photographerBio,
      slideshowEnabled: occasion.slideshowEnabled,
      slideshowInterval: occasion.slideshowInterval || 5,
      photoCount: occasion._count.photos,
      photos: occasion.photos,
    });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
