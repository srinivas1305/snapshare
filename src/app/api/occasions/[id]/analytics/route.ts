import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
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

    const [occasion, allEvents, deliveries] = await Promise.all([
      prisma.occasion.findUnique({
        where: { id: params.id },
        include: {
          _count: { select: { photos: true, smartAlbums: true } },
          photos: {
            select: {
              id: true,
              fileName: true,
              thumbnailPath: true,
              originalPath: true,
              fileSize: true,
              faceProcessed: true,
              uploadedById: true,
              uploadedBy: { select: { id: true, name: true } },
              faceDescriptors: { select: { id: true } },
            },
          },
        },
      }),
      prisma.viewEvent.findMany({
        where: { occasionId: params.id },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      prisma.photoDelivery.findMany({
        where: { occasionId: params.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    if (!occasion) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    const totalPhotos = occasion._count.photos;
    const facesIndexed = occasion.photos.filter((p) => p.faceProcessed).length;
    const totalFaces = occasion.photos.reduce((s, p) => s + p.faceDescriptors.length, 0);
    const totalSizeBytes = occasion.photos.reduce((s, p) => s + p.fileSize, 0);

    // Event summaries
    let galleryViews = 0;
    let photoViews = 0;
    let downloads = 0;
    let faceMatches = 0;
    let shares = 0;
    const visitorHashes = new Set<string>();
    const photoStats = new Map<string, { views: number; downloads: number }>();

    for (const ev of allEvents) {
      if (ev.ipHash) visitorHashes.add(ev.ipHash);
      if (ev.eventType === 'GALLERY_VIEW' || ev.eventType === 'QR_SCAN') galleryViews++;
      if (ev.eventType === 'PHOTO_VIEW') photoViews++;
      if (ev.eventType === 'DOWNLOAD') downloads++;
      if (ev.eventType === 'FACE_MATCH') faceMatches++;
      if (ev.eventType === 'SHARE') shares++;

      if (ev.photoId) {
        const cur = photoStats.get(ev.photoId) || { views: 0, downloads: 0 };
        if (ev.eventType === 'PHOTO_VIEW') cur.views++;
        if (ev.eventType === 'DOWNLOAD') cur.downloads++;
        photoStats.set(ev.photoId, cur);
      }
    }

    // Last 7 days daily breakdown
    const now = new Date();
    const dailyMap = new Map<string, { date: string; label: string; views: number; downloads: number; matches: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      dailyMap.set(key, { date: key, label, views: 0, downloads: 0, matches: 0 });
    }

    for (const ev of allEvents) {
      const key = new Date(ev.createdAt).toISOString().slice(0, 10);
      const bucket = dailyMap.get(key);
      if (!bucket) continue;
      if (ev.eventType === 'GALLERY_VIEW' || ev.eventType === 'PHOTO_VIEW' || ev.eventType === 'QR_SCAN') {
        bucket.views++;
      } else if (ev.eventType === 'DOWNLOAD') {
        bucket.downloads++;
      } else if (ev.eventType === 'FACE_MATCH') {
        bucket.matches++;
      }
    }

    // Top photos
    const topPhotos = occasion.photos
      .map((p) => {
        const s = photoStats.get(p.id) || { views: 0, downloads: 0 };
        return {
          id: p.id,
          fileName: p.fileName,
          thumbnailPath: p.thumbnailPath,
          originalPath: p.originalPath,
          views: s.views,
          downloads: s.downloads,
          score: s.views + s.downloads * 2,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // Photographer / collaborator breakdown
    const contributorMap = new Map<string, { userId: string; name: string; photoCount: number }>();
    for (const p of occasion.photos) {
      const existing = contributorMap.get(p.uploadedById) || {
        userId: p.uploadedById,
        name: p.uploadedBy.name,
        photoCount: 0,
      };
      existing.photoCount++;
      contributorMap.set(p.uploadedById, existing);
    }

    return NextResponse.json({
      totalPhotos,
      facesIndexed,
      totalFaces,
      totalSizeBytes,
      isActive: occasion.isActive,
      accessCode: occasion.accessCode,
      summary: {
        galleryViews,
        photoViews,
        downloads,
        faceMatches,
        shares,
        deliveries: deliveries.length,
        uniqueVisitors: visitorHashes.size,
      },
      dailyActivity: Array.from(dailyMap.values()),
      topPhotos,
      contributors: Array.from(contributorMap.values()).sort((a, b) => b.photoCount - a.photoCount),
      recentEvents: allEvents.slice(0, 15),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
