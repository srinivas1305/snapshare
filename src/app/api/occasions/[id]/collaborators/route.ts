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

    const collaborators = await prisma.collaborator.findMany({
      where: { occasionId: params.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(collaborators);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await getOccasionAccess(params.id, session.user.id, session.user.email);
    if (!access || access.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only the owner can invite photographers' }, { status: 403 });
    }

    const body = await request.json();
    const rawEmail = body.email as string;
    if (!rawEmail || !rawEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const email = rawEmail.trim().toLowerCase();
    if (email === session.user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'You already own this occasion' }, { status: 400 });
    }

    const invitedUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { email: rawEmail.trim() }] },
    });

    const existing = await prisma.collaborator.findFirst({
      where: { occasionId: params.id, invitedEmail: email },
    });

    if (existing) {
      if (existing.status === 'REJECTED') {
        const updated = await prisma.collaborator.update({
          where: { id: existing.id },
          data: { status: 'PENDING', userId: invitedUser?.id || existing.userId },
          include: { user: { select: { id: true, name: true, email: true } } },
        });
        return NextResponse.json(updated, { status: 201 });
      }
      return NextResponse.json({ error: 'Photographer already invited' }, { status: 409 });
    }

    const collaborator = await prisma.collaborator.create({
      data: {
        occasionId: params.id,
        userId: invitedUser?.id || null,
        invitedEmail: email,
        role: 'EDITOR',
        status: 'PENDING',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(collaborator, { status: 201 });
  } catch (error) {
    console.error('Error creating collaborator:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collaboratorId = searchParams.get('collaboratorId');
    if (!collaboratorId) {
      return NextResponse.json({ error: 'Collaborator ID is required' }, { status: 400 });
    }

    const access = await getOccasionAccess(params.id, session.user.id, session.user.email);
    const target = await prisma.collaborator.findFirst({
      where: { id: collaboratorId, occasionId: params.id },
    });

    if (!target) {
      return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    const isOwner = access?.role === 'OWNER';
    const isSelf =
      target.userId === session.user.id ||
      target.invitedEmail.toLowerCase() === session.user.email?.toLowerCase();

    if (!isOwner && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.collaborator.delete({ where: { id: collaboratorId } });
    return NextResponse.json({ message: 'Collaborator removed' });
  } catch (error) {
    console.error('Error deleting collaborator:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
