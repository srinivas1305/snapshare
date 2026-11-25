import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { syncUserCollaborations } from '@/lib/occasion-access';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const email = session.user.email?.trim().toLowerCase();
    await syncUserCollaborations(userId, email);

    const invites = await prisma.collaborator.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { userId },
          ...(email ? [{ invitedEmail: email }] : []),
        ],
      },
      include: {
        occasion: {
          select: {
            id: true,
            name: true,
            date: true,
            accessCode: true,
            user: { select: { name: true, email: true } },
            _count: { select: { photos: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invites);
  } catch (error) {
    console.error('Error fetching collaborations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collaboratorId, action } = await request.json();
    if (!collaboratorId || !['ACCEPT', 'DECLINE'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const userId = session.user.id;
    const email = session.user.email?.trim().toLowerCase();

    const invite = await prisma.collaborator.findFirst({
      where: {
        id: collaboratorId,
        OR: [
          { userId },
          ...(email ? [{ invitedEmail: email }] : []),
        ],
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const updated = await prisma.collaborator.update({
      where: { id: invite.id },
      data: {
        userId,
        status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error responding to collaboration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
