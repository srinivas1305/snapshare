import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const occasion = await prisma.occasion.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
      include: {
        photos: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { photos: true },
        },
      },
    });

    if (!occasion) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    return NextResponse.json(occasion);
  } catch (error) {
    console.error('Error fetching occasion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const occasion = await prisma.occasion.updateMany({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
      data: {
        name: body.name,
        description: body.description,
        date: body.date ? new Date(body.date) : undefined,
        isActive: body.isActive,
      },
    });

    if (occasion.count === 0) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    const updated = await prisma.occasion.findUnique({ where: { id: params.id } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating occasion:', error);
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

    const occasion = await prisma.occasion.deleteMany({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
    });

    if (occasion.count === 0) {
      return NextResponse.json({ error: 'Occasion not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Occasion deleted' });
  } catch (error) {
    console.error('Error deleting occasion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
