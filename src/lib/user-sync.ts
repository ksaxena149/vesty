import { prisma } from './db';

export interface ClerkUser {
  id: string;
  email_addresses: { email_address: string }[];
  first_name: string | null;
  last_name: string | null;
  created_at: number;
  updated_at: number;
}

export async function syncUserFromClerk(clerkUser: ClerkUser) {
  const email = clerkUser.email_addresses[0]?.email_address;
  
  if (!email) {
    throw new Error('User must have an email address');
  }

  const name = [clerkUser.first_name, clerkUser.last_name]
    .filter(Boolean)
    .join(' ') || null;

  try {
    // Upsert user (create or update)
    const user = await prisma.user.upsert({
      where: { id: clerkUser.id },
      update: {
        email,
        name,
        updatedAt: new Date(),
      },
      create: {
        id: clerkUser.id,
        email,
        name,
        createdAt: new Date(clerkUser.created_at),
        updatedAt: new Date(clerkUser.updated_at),
      },
    });

    console.log('✅ User synced:', { id: user.id, email: user.email, name: user.name });
    return user;
  } catch (error) {
    console.error('❌ Failed to sync user:', error);
    throw error;
  }
}

export async function deleteUserFromDb(userId: string) {
  try {
    // Delete user and all related data (cascading deletes will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    console.log('✅ User deleted:', userId);
  } catch (error) {
    console.error('❌ Failed to delete user:', error);
    throw error;
  }
}

export async function getUserFromDb(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        images: true,
        swaps: {
          include: {
            userImage: true,
            outfitImage: true,
            resultImage: true,
          },
        },
      },
    });

    return user;
  } catch (error) {
    console.error('❌ Failed to get user from database:', error);
    throw error;
  }
}
