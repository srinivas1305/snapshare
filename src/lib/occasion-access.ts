import prisma from '@/lib/prisma';

export type OccasionRole = 'OWNER' | 'EDITOR';

/**
 * Link any pending or accepted collaborator invites created by email
 * before the user created their account or signed in.
 */
export async function syncUserCollaborations(userId: string, email?: string | null) {
  if (!email) return;
  const normalized = email.trim().toLowerCase();
  try {
    await prisma.collaborator.updateMany({
      where: {
        userId: null,
        OR: [
          { invitedEmail: email },
          { invitedEmail: normalized },
        ],
      },
      data: { userId },
    });
  } catch (err) {
    console.warn('Could not sync user collaborations:', err);
  }
}

/**
 * Verify whether a user owns an occasion or is an accepted collaborator.
 */
export async function getOccasionAccess(
  occasionId: string,
  userId: string,
  userEmail?: string | null
) {
  const occasion = await prisma.occasion.findUnique({
    where: { id: occasionId },
    include: {
      collaborators: {
        where: { status: 'ACCEPTED' },
      },
    },
  });

  if (!occasion) return null;

  if (occasion.userId === userId) {
    return { occasion, role: 'OWNER' as OccasionRole };
  }

  const normalizedEmail = userEmail?.trim().toLowerCase();
  const isCollaborator = occasion.collaborators.some(
    (c) =>
      c.userId === userId ||
      (normalizedEmail && c.invitedEmail.toLowerCase() === normalizedEmail)
  );

  if (isCollaborator) {
    return { occasion, role: 'EDITOR' as OccasionRole };
  }

  return null;
}
