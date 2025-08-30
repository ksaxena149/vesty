import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { api } from "@/convex/_generated/api";
import { convexClient } from '@/lib/convex';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth(); // FIXED: auth() is now async

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get images from ConvexDB
    let images;
    if (type && ['USER', 'OUTFIT', 'RESULT'].includes(type)) {
      images = await convexClient.query(api.images.getImagesByUserAndType, { 
        userId, 
        type: type as "USER" | "OUTFIT" | "RESULT"
      });
    } else {
      images = await convexClient.query(api.images.getImagesByUser, { userId });
    }

    // Sort by creation date (most recent first) and paginate
    images.sort((a, b) => b.createdAt - a.createdAt);
    const total = images.length;
    const paginatedImages = images.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      images: paginatedImages.map(img => ({
        ...img,
        id: img._id,
        createdAt: new Date(img.createdAt),
        updatedAt: new Date(img.updatedAt),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('❌ Error fetching images:', error);
    return new NextResponse(
      `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth(); // FIXED: auth() is now async

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { type, url, filename, fileSize, mimeType } = body;

    // Validate required fields
    if (!type || !url) {
      return new NextResponse('Missing required fields: type, url', { status: 400 });
    }

    if (!['USER', 'OUTFIT', 'RESULT'].includes(type)) {
      return new NextResponse('Invalid image type', { status: 400 });
    }

    // Create image record in ConvexDB
    const imageId = await convexClient.mutation(api.images.createImage, {
      userId,
      type,
      url,
      filename,
      fileSize,
      mimeType,
    });

    // Get the created image to return
    const image = await convexClient.query(api.images.getImageById, { id: imageId });

    return NextResponse.json({
      ...image,
      id: image?._id,
      createdAt: image ? new Date(image.createdAt) : new Date(),
      updatedAt: image ? new Date(image.updatedAt) : new Date(),
    });

  } catch (error) {
    console.error('❌ Error creating image:', error);
    return new NextResponse(
      `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}