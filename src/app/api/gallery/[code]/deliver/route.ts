import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordViewEvent } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const { channel, recipientEmail, recipientPhone, photoIds } = body;

    if (!['EMAIL', 'WHATSAPP'].includes(channel)) {
      return NextResponse.json({ error: 'Channel must be EMAIL or WHATSAPP' }, { status: 400 });
    }

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one photo' }, { status: 400 });
    }

    if (channel === 'EMAIL' && (!recipientEmail || !recipientEmail.includes('@'))) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const occasion = await prisma.occasion.findUnique({
      where: { accessCode: params.code },
      include: { user: { select: { name: true } } },
    });

    if (!occasion || !occasion.isActive) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Validate photoIds belong to this occasion
    const validPhotos = await prisma.photo.findMany({
      where: {
        occasionId: occasion.id,
        id: { in: photoIds },
      },
      select: { id: true, fileName: true },
    });

    if (validPhotos.length === 0) {
      return NextResponse.json({ error: 'No matching photos found for delivery' }, { status: 400 });
    }

    const validIds = validPhotos.map((p) => p.id);
    const cleanedPhone = recipientPhone
      ? String(recipientPhone).replace(/[^\d+]/g, '')
      : null;

    const delivery = await prisma.photoDelivery.create({
      data: {
        occasionId: occasion.id,
        channel,
        recipientEmail: channel === 'EMAIL' ? String(recipientEmail).trim().toLowerCase() : null,
        recipientPhone: channel === 'WHATSAPP' ? cleanedPhone : null,
        photoIds: JSON.stringify(validIds),
        status: 'READY',
      },
    });

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    const baseUrl = host ? `${proto}://${host}` : process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const packUrl = `${baseUrl}/gallery/${params.code}/delivery/${delivery.id}`;
    const zipUrl = `${baseUrl}/api/photos/download?ids=${validIds.join(',')}`;

    let emailSent = false;
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'SnapShare <onboarding@resend.dev>';

    if (channel === 'EMAIL' && resendKey && delivery.recipientEmail) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [delivery.recipientEmail],
            subject: `Your ${validIds.length} photo${validIds.length === 1 ? '' : 's'} from ${occasion.name}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; color: #18181b; padding: 24px 0;">
                <p style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #737373; margin-bottom: 8px;">${occasion.brandName || occasion.user.name}</p>
                <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 12px;">${occasion.name}</h1>
                <p style="font-size: 14px; color: #525252; line-height: 1.5;">
                  We gathered ${validIds.length} full-resolution photo${validIds.length === 1 ? '' : 's'} for you.
                </p>
                <p style="margin: 24px 0;">
                  <a href="${packUrl}" style="display: inline-block; background: #18181b; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 500; padding: 10px 18px; border-radius: 4px;">
                    View & download your photos
                  </a>
                </p>
                <p style="font-size: 12px; color: #737373;">
                  Direct ZIP download: <a href="${zipUrl}" style="color: #18181b;">Download archive</a>
                </p>
              </div>
            `,
          }),
        });

        if (emailRes.ok) {
          emailSent = true;
          await prisma.photoDelivery.update({
            where: { id: delivery.id },
            data: { status: 'SENT', sentAt: new Date() },
          });
        }
      } catch (err) {
        console.warn('Resend delivery failed, falling back to pack link:', err);
      }
    }

    await recordViewEvent({
      occasionId: occasion.id,
      eventType: 'DELIVERY',
      request,
    });

    const messageText = `Your ${validIds.length} photo${validIds.length === 1 ? '' : 's'} from ${occasion.name}: ${packUrl}`;
    const cleanWaDigits = cleanedPhone ? cleanedPhone.replace(/^\+/, '') : '';
    const whatsappUrl = cleanWaDigits
      ? `https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

    const mailtoUrl = delivery.recipientEmail
      ? `mailto:${delivery.recipientEmail}?subject=${encodeURIComponent(`Your photos from ${occasion.name}`)}&body=${encodeURIComponent(
          `Here are your ${validIds.length} photo(s) from ${occasion.name}:\n\nView & download pack:\n${packUrl}\n\nDirect ZIP archive:\n${zipUrl}`
        )}`
      : null;

    return NextResponse.json({
      deliveryId: delivery.id,
      packUrl,
      zipUrl,
      emailSent,
      mailtoUrl,
      whatsappUrl,
      photoCount: validIds.length,
    });
  } catch (error) {
    console.error('Error creating photo delivery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
