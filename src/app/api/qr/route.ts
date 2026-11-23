import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const occasionId = searchParams.get('occasionId');

    if (!occasionId) {
      return NextResponse.json({ error: 'Occasion ID is required' }, { status: 400 });
    }

    const occasion = await prisma.occasion.findFirst({
      where: {
        id: occasionId,
        userId: (session.user as any).id,
      },
    });

    if (!occasion) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const galleryUrl = `${baseUrl}/gallery/${occasion.accessCode}`;

    const qrDataUrl = await QRCode.toDataURL(galleryUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1e3a8a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });

    return NextResponse.json({
      qrCode: qrDataUrl,
      galleryUrl,
      accessCode: occasion.accessCode,
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
