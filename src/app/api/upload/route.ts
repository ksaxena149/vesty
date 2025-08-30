/**
 * Image Upload API Endpoint
 * Handles file uploads with validation, optimization, and S3 storage
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { validateFile, uploadToS3, generateFileKey, validateS3Config } from '@/lib/aws-s3';
import { optimizeImage, validateImageBuffer, calculateOptimalSettings } from '@/lib/image-processing';
import { api } from '@/convex/_generated/api';
import { convexClient } from '@/lib/convex';
import type { Id } from '@/convex/_generated/dataModel';

// Maximum file size for upload (5MB)
// const MAX_FILE_SIZE = 5 * 1024 * 1024; // Currently unused

async function ensureUserExists(userId: string) {
  try {
    // Check if user exists in database
    const existingUser = await convexClient.query(api.users.getUserById, {
      id: userId
    });

    if (existingUser) {
      console.log('✅ User exists in database:', existingUser.email);
      return existingUser;
    }

    console.log('🔄 User not found in database, fetching from Clerk...');
    
    // Get user data from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw new Error('Unable to fetch user data from Clerk');
    }

    // Create user in database - construct data with proper typing
    const userData: any = {
      id: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
    };
    
    const userName = clerkUser.firstName && clerkUser.lastName 
      ? `${clerkUser.firstName} ${clerkUser.lastName}`
      : clerkUser.firstName || clerkUser.lastName;
    
    if (userName) {
      userData.name = userName;
    }
    
    await convexClient.mutation(api.users.createOrUpdateUser, userData);

    // Get the created user
    const newUser = await convexClient.query(api.users.getUserById, {
      id: userId
    });

    console.log('✅ User created in database:', newUser?.email);
    return newUser;
  } catch (error) {
    console.error('❌ Failed to ensure user exists:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Debug: Log request info
    console.log('=== UPLOAD API DEBUG ===');
    console.log('Request URL:', req.url);
    
    // Check authentication (FIXED: auth() is now async!)
    const authResult = await auth();
    console.log('Auth result:', { userId: authResult.userId });
    
    const { userId } = authResult;
    if (!userId) {
      console.log('❌ No userId found, returning 401');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', userId);

    // FIXED: Ensure user exists in database before creating image
    await ensureUserExists(userId);

    // Validate S3 configuration
    const s3Config = validateS3Config();
    if (!s3Config.valid) {
      console.error('S3 Configuration Error:', s3Config.error);
      return NextResponse.json(
        { error: 'Storage service configuration error' },
        { status: 500 }
      );
    }

    console.log('✅ S3 configuration valid');

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      console.log('❌ No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('✅ File received:', file.name, file.size, 'bytes');

    // Validate file using our validation function
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      console.log('❌ File validation failed:', fileValidation.error);
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    console.log('✅ File validation passed');

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate image buffer
    const imageValidation = await validateImageBuffer(buffer);
    if (!imageValidation.valid) {
      console.log('❌ Image validation failed:', imageValidation.error);
      return NextResponse.json(
        { error: imageValidation.error },
        { status: 400 }
      );
    }

    console.log('✅ Image validation passed');

    // Calculate optimal compression settings
    const optimizationSettings = calculateOptimalSettings(buffer.length);
    console.log('Optimization settings:', optimizationSettings);
    
    // Optimize image
    const optimizationResult = await optimizeImage(buffer, optimizationSettings);
    if (!optimizationResult.success) {
      console.log('❌ Image optimization failed:', optimizationResult.error);
      return NextResponse.json(
        { error: `Image optimization failed: ${optimizationResult.error}` },
        { status: 500 }
      );
    }

    if (!optimizationResult.buffer || !optimizationResult.metadata) {
      console.log('❌ Image optimization produced invalid result');
      return NextResponse.json(
        { error: 'Image optimization produced invalid result' },
        { status: 500 }
      );
    }

    console.log('✅ Image optimized:', optimizationResult.metadata);

    // Generate unique file key for S3
    const fileKey = generateFileKey(file.name, userId);
    console.log('Generated S3 key:', fileKey);
    
    // Upload to S3
    const uploadResult = await uploadToS3(
      optimizationResult.buffer,
      fileKey,
      `image/${optimizationResult.metadata.format}`,
      {
        userId,
        originalFilename: file.name,
        optimized: 'true',
      }
    );

    if (!uploadResult.success) {
      console.log('❌ S3 upload failed:', uploadResult.error);
      return NextResponse.json(
        { error: `Upload failed: ${uploadResult.error}` },
        { status: 500 }
      );
    }

    console.log('✅ S3 upload successful:', uploadResult.url);

    // Save image record to database (user is guaranteed to exist now)
    const imageRecordId = await convexClient.mutation(api.images.createImage, {
      userId,
      type: 'USER', // For user-uploaded photos
      url: uploadResult.url!, // Map storageUrl to url
      filename: file.name,
      fileSize: optimizationResult.metadata.size, // Map optimizedSize to fileSize
      mimeType: `image/${optimizationResult.metadata.format}`, // Add mimeType
    });

    // Get the created image record
    const imageRecord = await convexClient.query(api.images.getImageById, {
      id: imageRecordId
    });

    console.log('✅ Database record created:', imageRecord?._id);
    console.log('=== UPLOAD SUCCESS ===');

    // Return success response with all metadata
    return NextResponse.json({
      success: true,
      data: {
        id: imageRecord?._id,
        filename: imageRecord?.filename,
        url: uploadResult.url,
        metadata: {
          width: optimizationResult.metadata.width,
          height: optimizationResult.metadata.height,
          format: optimizationResult.metadata.format,
          originalSize: buffer.length,
          optimizedSize: optimizationResult.metadata.size,
          compressionRatio: optimizationResult.metadata.compressionRatio,
        },
      },
    });

  } catch (error) {
    console.error('❌ Upload API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during upload' },
      { status: 500 }
    );
  }
}

export async function GET(_req: NextRequest) {
  try {
    // Check authentication (FIXED: auth() is now async!)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's uploaded images
    const allImages = await convexClient.query(api.images.getImagesByUserAndType, {
      userId,
      type: 'USER', // Filter for user-uploaded images only
    });
    
    // Sort by createdAt desc (ConvexDB doesn't have built-in orderBy)
    const images = allImages
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(img => ({
        id: img._id,
        filename: img.filename,
        url: img.url,
        fileSize: img.fileSize,
        mimeType: img.mimeType,
        createdAt: img.createdAt,
      }));

    return NextResponse.json({
      success: true,
      data: {
        images,
        count: images.length,
      },
    });

  } catch (error) {
    console.error('Get Images API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check authentication (FIXED: auth() is now async!)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID required' },
        { status: 400 }
      );
    }

    // Find the image record (ConvexDB uses _id instead of id)
    const image = await convexClient.query(api.images.getImageById, {
      id: imageId as Id<"images">, // ConvexDB ID type
    });

    if (!image || image.userId !== userId) {
      return NextResponse.json(
        { error: 'Image not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete from S3 (optional - you might want to keep files for safety)
    // const deleteResult = await deleteFromS3(image.storageKey);
    // if (!deleteResult) {
    //   console.warn('Failed to delete file from S3:', image.storageKey);
    // }

    // Delete from database
    await convexClient.mutation(api.images.deleteImage, {
      id: image._id,
    });

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });

  } catch (error) {
    console.error('Delete Image API Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}