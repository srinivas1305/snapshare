import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { saveBrandLogo, deleteSingleKey } from '@/lib/storage';
import { getOccasionAccess } from '@/lib/occasion-access';

export const dynamic = 'force-dynamic';

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
      return NextResponse.json({ error: 'Only the owner can update the logo' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Logo file is required' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Logo must be under 5 MB' }, { status: 400 });
    }

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Use PNG, JPEG, or WebP' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const logoKey = await saveBrandLogo(buffer);

    if (access.occasion.logoUrl && access.occasion.logoUrl.startsWith('logos/')) {
      await deleteSingleKey(access.occasion.logoUrl);
    }

    await prisma.occasion.update({
      where: { id: params.id },
      data: { logoUrl: logoKey },
    });

    return NextResponse.json({ logoUrl: logoKey });
  } catch (error) {
    console.error('Error uploading logo:', error);
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

    const access = await getOccasionAccess(params.id, session.user.id, session.user.email);
    if (!access || access.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only the owner can remove the logo' }, { status: 403 });
    }

    if (access.occasion.logoUrl && access.occasion.logoUrl.startsWith('logos/')) {
      await deleteSingleKey(access.occasion.logoUrl);
    }

    await prisma.occasion.update({
      where: { id: params.id },
      data: { logoUrl: null },
    });

    return NextResponse.json({ logoUrl: null });
  } catch (error) {
    console.error('Error removing logo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
