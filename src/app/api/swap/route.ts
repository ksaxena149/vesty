import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { api } from "@/convex/_generated/api";
import { convexClient } from '@/lib/convex';
import { performOutfitSwap, imageToBase64Server } from '@/services/ai-service';
import { uploadFileToS3, uploadBase64ToS3, validateS3Config } from '@/lib/aws-s3';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const outfitImage = formData.get('outfitImage') as File;
    const personImage = formData.get('personImage') as File;

    // Validate required files
    if (!outfitImage || !personImage) {
      return NextResponse.json(
        { error: 'Both outfit image and person image are required' },
        { status: 400 }
      );
    }

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(outfitImage.type) || !allowedTypes.includes(personImage.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file sizes (5MB max each)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (outfitImage.size > maxSize || personImage.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 5MB per image.' },
        { status: 400 }
      );
    }

    console.log('Starting outfit swap process for user:', userId);
    console.log('Outfit image:', outfitImage.name, outfitImage.size, 'bytes');
    console.log('Person image:', personImage.name, personImage.size, 'bytes');

    // Convert images to base64
    const outfitImageBase64 = await imageToBase64Server(outfitImage);
    const personImageBase64 = await imageToBase64Server(personImage);

    // Perform the complete outfit swap workflow
    const swapResult = await performOutfitSwap(outfitImageBase64, personImageBase64);

    if (!swapResult.success) {
      return NextResponse.json(
        { error: swapResult.error || 'Failed to process outfit swap' },
        { status: 500 }
      );
    }

    // Validate S3 configuration
    const s3Config = validateS3Config();
    if (!s3Config.valid) {
      console.error('S3 configuration error:', s3Config.error);
      return NextResponse.json(
        { error: `Storage configuration error: ${s3Config.error}` },
        { status: 500 }
      );
    }

    console.log('Uploading images to S3...');
    
    // First, ensure user exists in ConvexDB
    await convexClient.mutation(api.users.createOrUpdateUser, {
      id: userId,
      email: '', // We could get this from Clerk if needed
    });

    // Upload user's person image to S3
    console.log('Uploading person image to S3...');
    const userImageUpload = await uploadFileToS3(personImage, userId);
    if (!userImageUpload.success) {
      return NextResponse.json(
        { error: `Failed to upload person image: ${userImageUpload.error}` },
        { status: 500 }
      );
    }

    // Upload user's outfit image to S3
    console.log('Uploading outfit image to S3...');
    const outfitImageUpload = await uploadFileToS3(outfitImage, userId);
    if (!outfitImageUpload.success) {
      return NextResponse.json(
        { error: `Failed to upload outfit image: ${outfitImageUpload.error}` },
        { status: 500 }
      );
    }

    // Save image records to ConvexDB with S3 URLs
    const userImageId = await convexClient.mutation(api.images.createImage, {
      userId,
      type: 'USER',
      url: userImageUpload.url!,
      filename: personImage.name,
      fileSize: personImage.size,
      mimeType: personImage.type,
    });

    const outfitImageId = await convexClient.mutation(api.images.createImage, {
      userId,
      type: 'OUTFIT', 
      url: outfitImageUpload.url!,
      filename: outfitImage.name,
      fileSize: outfitImage.size,
      mimeType: outfitImage.type,
    });

    // Upload generated AI image to S3 (if we have one)
    let resultImageId = null;
    if (swapResult.generatedImageUrl) {
      console.log('Uploading generated image to S3...');
      const resultFilename = `swap-result-${Date.now()}.png`;
      const resultImageUpload = await uploadBase64ToS3(
        swapResult.generatedImageUrl,
        resultFilename,
        userId
      );
      
      if (!resultImageUpload.success) {
        console.error('Failed to upload generated image to S3:', resultImageUpload.error);
        // Continue without saving result image rather than failing the entire request
      } else {
        resultImageId = await convexClient.mutation(api.images.createImage, {
          userId,
          type: 'RESULT',
          url: resultImageUpload.url!,
          filename: resultFilename,
          fileSize: resultImageUpload.metadata?.size || 0,
          mimeType: 'image/png',
        });
      }
    }

    // Create the swap record
    const swapData: any = {
      userId,
      userImageId,
      outfitImageId,
      status: 'COMPLETED',
    };
    
    // Only include resultImageId if it's not null
    if (resultImageId) {
      swapData.resultImageId = resultImageId;
    }
    
    const swapId = await convexClient.mutation(api.swaps.createSwap, swapData);

    // Update with completion timestamp
    await convexClient.mutation(api.swaps.updateSwapStatus, {
      id: swapId,
      status: 'COMPLETED',
      processingCompletedAt: Date.now(),
    });

    const swap = {
      id: swapId,
      status: 'COMPLETED',
      processingCompletedAt: new Date()
    };

    console.log('Outfit swap completed successfully:', swap.id);

    // Get the final result image URL (S3 URL if uploaded, otherwise original base64)
    const finalImageUrl = resultImageId 
      ? (await convexClient.query(api.images.getImageById, { id: resultImageId }))?.url || swapResult.generatedImageUrl
      : swapResult.generatedImageUrl;

    return NextResponse.json({
      success: true,
      swapId: swap.id,
      resultImageId: resultImageId, // Include image ID for presigned URL generation
      generatedImageUrl: finalImageUrl,
      message: 'Outfit swap completed successfully',
      storage: 's3', // Indicate that images are stored in S3
    });

  } catch (error) {
    console.error('Error in outfit swap API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during outfit swap',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve swap history
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get swaps from ConvexDB
    const allSwaps = await convexClient.query(api.swaps.getSwapsByUser, { userId });
    const completedSwaps = allSwaps.filter(swap => swap.status === 'COMPLETED');
    
    // Paginate results
    const paginatedSwaps = completedSwaps.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      swaps: paginatedSwaps.map(swap => ({
        id: swap._id,
        createdAt: new Date(swap.createdAt),
        status: swap.status,
        generatedImageUrl: swap.resultImage?.url || null
      })),
      total: completedSwaps.length
    });

  } catch (error) {
    console.error('Error fetching swap history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch swap history' },
      { status: 500 }
    );
  }
}
