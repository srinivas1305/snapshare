import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOccasionAccess } from '@/lib/occasion-access';

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

    const access = await getOccasionAccess(occasionId, session.user.id, session.user.email);
    if (!access) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    const occasion = access.occasion;
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const dynamicBase = host ? `${proto}://${host}` : null;
    const baseUrl = dynamicBase || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const galleryUrl = `${baseUrl}/gallery/${occasion.accessCode}`;
    const slideshowUrl = `${baseUrl}/gallery/${occasion.accessCode}/slideshow`;

    const qrDataUrl = await QRCode.toDataURL(galleryUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#18181b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });

    return NextResponse.json({
      qrCode: qrDataUrl,
      galleryUrl,
      slideshowUrl,
      accessCode: occasion.accessCode,
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
