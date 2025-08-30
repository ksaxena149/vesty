import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { performOutfitSwap, imageToBase64Server } from '@/services/ai-service';

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

    // TODO: Temporarily bypassing database for testing
    console.log('Skipping database save for testing...');
    
    /* Database operations temporarily disabled for testing
    // First, create image records for the uploaded images and generated result
    console.log('Saving images to database...');
    
    // Save user image
    const userImage = await prisma.image.create({
      data: {
        userId,
        type: 'USER',
        url: '', // We could upload to S3 here if needed
        filename: personImage.name,
        fileSize: personImage.size,
        mimeType: personImage.type,
      }
    });

    // Save outfit image  
    const outfitImageRecord = await prisma.image.create({
      data: {
        userId,
        type: 'OUTFIT', 
        url: '', // We could upload to S3 here if needed
        filename: outfitImage.name,
        fileSize: outfitImage.size,
        mimeType: outfitImage.type,
      }
    });

    // Save generated result image (if we have one)
    let resultImageRecord = null;
    if (swapResult.generatedImageUrl) {
      resultImageRecord = await prisma.image.create({
        data: {
          userId,
          type: 'RESULT',
          url: swapResult.generatedImageUrl,
          filename: `swap-result-${Date.now()}.png`,
          fileSize: 0, // We don't know the size of generated image
          mimeType: 'image/png',
        }
      });
    }

    // Now create the swap record with proper foreign keys
    const swap = await prisma.swap.create({
      data: {
        userId,
        userImageId: userImage.id,
        outfitImageId: outfitImageRecord.id,
        resultImageId: resultImageRecord?.id,
        status: 'COMPLETED', // Use correct enum value
        processingCompletedAt: new Date(),
      }
    });
    */

    // Temporary response for testing
    const swap = { 
      id: `temp-swap-${Date.now()}`,
      status: 'COMPLETED',
      processingCompletedAt: new Date()
    };

    console.log('Outfit swap completed successfully:', swap.id);

    return NextResponse.json({
      success: true,
      swapId: swap.id,
      generatedImageUrl: swapResult.generatedImageUrl,
      message: 'Outfit swap completed successfully'
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

    const swaps = await prisma.swap.findMany({
      where: {
        userId,
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        createdAt: true,
        status: true,
        resultImage: {
          select: {
            url: true,
            filename: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      swaps: swaps.map(swap => ({
        id: swap.id,
        createdAt: swap.createdAt,
        status: swap.status,
        generatedImageUrl: swap.resultImage?.url || null
      })),
      total: await prisma.swap.count({
        where: { userId, status: 'COMPLETED' }
      })
    });

  } catch (error) {
    console.error('Error fetching swap history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch swap history' },
      { status: 500 }
    );
  }
}
