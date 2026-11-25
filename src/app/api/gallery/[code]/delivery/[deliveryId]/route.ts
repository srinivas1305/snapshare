import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string; deliveryId: string } }
) {
  try {
    const occasion = await prisma.occasion.findUnique({
      where: { accessCode: params.code },
      include: { user: { select: { name: true } } },
    });

    if (!occasion || !occasion.isActive) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    const delivery = await prisma.photoDelivery.findFirst({
      where: {
        id: params.deliveryId,
        occasionId: occasion.id,
      },
    });

    if (!delivery) {
      return NextResponse.json({ error: 'Photo pack not found' }, { status: 404 });
    }

    let photoIds: string[] = [];
    try {
      photoIds = JSON.parse(delivery.photoIds);
    } catch {
      photoIds = [];
    }

    const photos = await prisma.photo.findMany({
      where: {
        occasionId: occasion.id,
        id: { in: photoIds },
      },
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
    });

    return NextResponse.json({
      deliveryId: delivery.id,
      createdAt: delivery.createdAt,
      occasion: {
        name: occasion.name,
        description: occasion.description,
        date: occasion.date,
        accessCode: occasion.accessCode,
        photographerName: occasion.brandName || occasion.user.name,
        accentColor: occasion.accentColor || '#18181b',
        logoUrl: occasion.logoUrl,
        photographerBio: occasion.photographerBio,
      },
      photos,
    });
  } catch (error) {
    console.error('Error loading photo delivery pack:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
