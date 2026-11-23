import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateAccessCode } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const occasions = await prisma.occasion.findMany({
      where: { userId: (session.user as any).id },
      include: {
        _count: {
          select: { photos: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(occasions);
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
    const { name, description, date } = body;

    if (!name || !date) {
      return NextResponse.json({ error: 'Name and date are required' }, { status: 400 });
    }

    // Generate unique access code
    let accessCode = generateAccessCode();
    let codeExists = await prisma.occasion.findUnique({ where: { accessCode } });
    while (codeExists) {
      accessCode = generateAccessCode();
      codeExists = await prisma.occasion.findUnique({ where: { accessCode } });
    }

    const occasion = await prisma.occasion.create({
      data: {
        name,
        description: description || null,
        date: new Date(date),
        accessCode,
        userId: (session.user as any).id,
      },
    });

    return NextResponse.json(occasion, { status: 201 });
  } catch (error) {
    console.error('Error creating occasion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
