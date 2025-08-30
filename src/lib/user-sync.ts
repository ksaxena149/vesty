import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// Initialize Convex client for server-side operations
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
    // Create or update user in ConvexDB
    const userId = await convex.mutation(api.users.createOrUpdateUser, {
      id: clerkUser.id,
      email,
      name,
    });

    // Get the user data to return
    const user = await convex.query(api.users.getUserById, { id: clerkUser.id });

    console.log('✅ User synced:', { id: user?.id, email: user?.email, name: user?.name });
    return user ? {
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    } : null;
  } catch (error) {
    console.error('❌ Failed to sync user:', error);
    throw error;
  }
}

export async function deleteUserFromDb(userId: string) {
  try {
    // Note: ConvexDB doesn't have automatic cascading deletes like SQL
    // You would need to implement cleanup logic manually here
    // For now, we'll just log that deletion is needed
    console.log('⚠️ User deletion requested for:', userId);
    console.log('⚠️ Manual cleanup of related records may be needed');
    
    // TODO: Implement manual cleanup of images and swaps
    // const userImages = await convex.query(api.images.getImagesByUser, { userId });
    // const userSwaps = await convex.query(api.swaps.getSwapsByUser, { userId });
    // Clean up these records before deleting the user
    
  } catch (error) {
    console.error('❌ Failed to delete user:', error);
    throw error;
  }
}

export async function getUserFromDb(userId: string) {
  try {
    const [user, images, swaps] = await Promise.all([
      convex.query(api.users.getUserById, { id: userId }),
      convex.query(api.images.getImagesByUser, { userId }),
      convex.query(api.swaps.getSwapsByUser, { userId })
    ]);

    if (!user) {
      return null;
    }

    return {
      ...user,
      id: user.id,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
      images: images.map(img => ({
        ...img,
        id: img._id,
        createdAt: new Date(img.createdAt),
        updatedAt: new Date(img.updatedAt),
      })),
      swaps: swaps.map(swap => ({
        ...swap,
        id: swap._id,
        createdAt: new Date(swap.createdAt),
        updatedAt: new Date(swap.updatedAt),
        userImage: swap.userImage ? {
          ...swap.userImage,
          id: swap.userImage._id,
          createdAt: new Date(swap.userImage.createdAt),
          updatedAt: new Date(swap.userImage.updatedAt),
        } : null,
        outfitImage: swap.outfitImage ? {
          ...swap.outfitImage,
          id: swap.outfitImage._id,
          createdAt: new Date(swap.outfitImage.createdAt),
          updatedAt: new Date(swap.outfitImage.updatedAt),
        } : null,
        resultImage: swap.resultImage ? {
          ...swap.resultImage,
          id: swap.resultImage._id,
          createdAt: new Date(swap.resultImage.createdAt),
          updatedAt: new Date(swap.resultImage.updatedAt),
        } : null,
      })),
    };
  } catch (error) {
    console.error('❌ Failed to get user from database:', error);
    throw error;
  }
}
