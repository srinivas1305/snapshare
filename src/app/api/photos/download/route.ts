import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import prisma from '@/lib/prisma';
import { getPhotoBuffer } from '@/lib/storage';
import { recordViewEvent } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('id');
    const photoIds = searchParams.get('ids');

    if (photoId) {
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
      });

      if (!photo) {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
      }

      const fileBuffer = await getPhotoBuffer(photo.originalPath);
      await recordViewEvent({
        occasionId: photo.occasionId,
        photoId: photo.id,
        eventType: 'DOWNLOAD',
        request,
      });

      const uint8File = new Uint8Array(fileBuffer);
      return new NextResponse(uint8File, {
        headers: {
          'Content-Type': photo.mimeType,
          'Content-Disposition': `attachment; filename="${photo.fileName}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    if (photoIds) {
      const ids = photoIds.split(',').filter(Boolean);
      const photos = await prisma.photo.findMany({
        where: { id: { in: ids } },
      });

      if (photos.length === 0) {
        return NextResponse.json({ error: 'No photos found' }, { status: 404 });
      }

      const archive = archiver('zip', { zlib: { level: 0 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));

      const archiveFinished = new Promise<Buffer>((resolve, reject) => {
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', reject);
      });

      const usedNames = new Map<string, number>();
      for (const photo of photos) {
        try {
          const buffer = await getPhotoBuffer(photo.originalPath);
          const count = usedNames.get(photo.fileName) || 0;
          usedNames.set(photo.fileName, count + 1);
          const entryName =
            count === 0 ? photo.fileName : `${count}_${photo.fileName}`;
          archive.append(buffer, { name: entryName });
        } catch (err) {
          console.error(`Error attaching photo ${photo.fileName} to zip:`, err);
        }
      }

      await archive.finalize();
      const zipBuffer = await archiveFinished;

      await recordViewEvent({
        occasionId: photos[0].occasionId,
        photoId: photos.length === 1 ? photos[0].id : null,
        eventType: 'DOWNLOAD',
        request,
      });

      const uint8 = new Uint8Array(zipBuffer);
      return new NextResponse(uint8, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="snapshare-photos.zip"',
          'Content-Length': zipBuffer.length.toString(),
        },
      });
    }

    return NextResponse.json({ error: 'Photo ID or IDs required' }, { status: 400 });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
