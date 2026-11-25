import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordViewEvent, AnalyticsEventType } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS: AnalyticsEventType[] = [
  'GALLERY_VIEW',
  'PHOTO_VIEW',
  'QR_SCAN',
  'SHARE',
];

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const { eventType, photoId } = body;

    if (!ALLOWED_EVENTS.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const occasion = await prisma.occasion.findUnique({
      where: { accessCode: params.code },
      select: { id: true, isActive: true },
    });

    if (!occasion || !occasion.isActive) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    await recordViewEvent({
      occasionId: occasion.id,
      photoId: photoId || null,
      eventType,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error recording event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
