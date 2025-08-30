import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUrl } from '@/lib/aws-s3';
import { api } from "@/convex/_generated/api";
import { convexClient } from '@/lib/convex';
import type { Id } from '@/convex/_generated/dataModel';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');
    const action = searchParams.get('action') || 'view'; // 'view' or 'download'
    
    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    // Get image from ConvexDB to verify ownership and get S3 key
    const image = await convexClient.query(api.images.getImageById, { id: imageId as Id<"images"> });
    
    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Verify user owns this image (security check)
    if (image.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Extract S3 key from the URL
    // URL format: https://bucket-name.s3.region.amazonaws.com/key
    const s3Key = image.url.split('.amazonaws.com/')[1];
    
    if (!s3Key) {
      return NextResponse.json(
        { error: 'Invalid image URL format' },
        { status: 500 }
      );
    }

    // Generate presigned URL (valid for 1 hour for viewing, 5 min for download)
    const expiresIn = action === 'download' ? 300 : 3600;
    const presignedUrl = await generatePresignedUrl(s3Key, expiresIn);

    if (!presignedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate secure URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: presignedUrl,
      expiresIn,
      action,
      filename: image.filename || 'image.jpg'
    });

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate secure image URL' },
      { status: 500 }
    );
  }
}
