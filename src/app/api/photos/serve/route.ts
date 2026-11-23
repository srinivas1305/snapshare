import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getPhotoBuffer } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoPath = searchParams.get('path');

    if (!photoPath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // Prevent directory traversal
    const normalizedPath = path.normalize(photoPath);
    if (normalizedPath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    try {
      const fileBuffer = await getPhotoBuffer(normalizedPath);
      const ext = path.extname(normalizedPath).toLowerCase();

      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.tiff': 'image/tiff',
        '.tif': 'image/tiff',
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (err) {
      console.error('Error getting photo buffer:', err);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error serving photo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
