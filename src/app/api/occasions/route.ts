import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateAccessCode } from '@/lib/storage';
import { syncUserCollaborations } from '@/lib/occasion-access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email?.trim().toLowerCase();
    await syncUserCollaborations(userId, userEmail);

    const occasions = await prisma.occasion.findMany({
      where: {
        OR: [
          { userId },
          {
            collaborators: {
              some: {
                status: 'ACCEPTED',
                OR: [
                  { userId },
                  ...(userEmail ? [{ invitedEmail: userEmail }] : []),
                ],
              },
            },
          },
        ],
      },
      include: {
        user: { select: { name: true } },
        _count: {
          select: { photos: true, collaborators: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = occasions.map((o) => ({
      ...o,
      role: o.userId === userId ? 'OWNER' : 'EDITOR',
      ownerName: o.user.name,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching occasions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      date,
      accentColor,
      brandName,
      photographerBio,
      logoUrl,
      slideshowEnabled,
      slideshowInterval,
    } = body;

    if (!name || !date) {
      return NextResponse.json({ error: 'Name and date are required' }, { status: 400 });
    }

    let accessCode = generateAccessCode();
    let codeExists = await prisma.occasion.findUnique({ where: { accessCode } });
    while (codeExists) {
      accessCode = generateAccessCode();
      codeExists = await prisma.occasion.findUnique({ where: { accessCode } });
    }

    const occasion = await prisma.occasion.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        date: new Date(date),
        accessCode,
        accentColor: accentColor || '#18181b',
        brandName: brandName?.trim() || null,
        photographerBio: photographerBio?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        slideshowEnabled: Boolean(slideshowEnabled),
        slideshowInterval: typeof slideshowInterval === 'number' ? Math.max(2, Math.min(60, slideshowInterval)) : 5,
        userId: session.user.id,
      },
    });

    return NextResponse.json(occasion, { status: 201 });
  } catch (error) {
    console.error('Error creating occasion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
