import crypto from 'crypto';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export type AnalyticsEventType =
  | 'GALLERY_VIEW'
  | 'PHOTO_VIEW'
  | 'DOWNLOAD'
  | 'FACE_MATCH'
  | 'QR_SCAN'
  | 'SHARE'
  | 'DELIVERY';

/**
 * Record an anonymous analytics event without blocking or failing the caller.
 */
export async function recordViewEvent(params: {
  occasionId: string;
  eventType: AnalyticsEventType;
  photoId?: string | null;
  request?: NextRequest;
}) {
  try {
    const { occasionId, eventType, photoId, request } = params;
    let ipHash: string | null = null;
    let userAgent: string | null = null;

    if (request) {
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
      const salt = process.env.NEXTAUTH_SECRET || 'snapshare-analytics';
      ipHash = crypto.createHash('sha256').update(`${ip}:${salt}`).digest('hex').slice(0, 16);
      userAgent = request.headers.get('user-agent')?.slice(0, 120) || null;
    }

    await prisma.viewEvent.create({
      data: {
        occasionId,
        photoId: photoId || null,
        eventType,
        ipHash,
        userAgent,
      },
    });
  } catch (err) {
    console.warn('Analytics event recording skipped:', err);
  }
}
