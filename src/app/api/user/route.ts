import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getUserFromDb } from '@/lib/user-sync';

export async function GET() {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user data from database
    const user = await getUserFromDb(userId);

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Return user data with stats
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      stats: {
        totalImages: user.images.length,
        totalSwaps: user.swaps.length,
        completedSwaps: user.swaps.filter(swap => swap.status === 'COMPLETED').length,
        pendingSwaps: user.swaps.filter(swap => swap.status === 'PENDING').length,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching user:', error);
    return new NextResponse(
      `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}
