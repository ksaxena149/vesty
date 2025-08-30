/**
 * Image Processing & Optimization Service
 * Handles image compression, resizing, and optimization using Sharp
 */

import sharp from 'sharp';

// Image processing configuration
export const IMAGE_CONFIG = {
  // Maximum dimensions for different use cases
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1080,
  THUMBNAIL_WIDTH: 300,
  THUMBNAIL_HEIGHT: 300,
  
  // Quality settings
  JPEG_QUALITY: 85,
  WEBP_QUALITY: 80,
  PNG_COMPRESSION: 8,
  
  // File size targets (in bytes)
  TARGET_FILE_SIZE: 1024 * 1024, // 1MB target
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB max after optimization
} as const;

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  progressive?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  buffer?: Buffer;
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
    originalSize: number;
    compressionRatio: number;
  };
  error?: string;
}

/**
 * Get image metadata without processing
 */
export async function getImageMetadata(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: metadata.size || buffer.length,
      hasAlpha: metadata.hasAlpha || false,
      channels: metadata.channels || 3,
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    return null;
  }
}

/**
 * Optimize image for web upload
 */
export async function optimizeImage(
  buffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<ProcessingResult> {
  try {
    const originalSize = buffer.length;
    
    // Get original metadata
    const metadata = await getImageMetadata(buffer);
    if (!metadata) {
      return {
        success: false,
        error: 'Unable to read image metadata',
      };
    }

    // Set default options
    const {
      maxWidth = IMAGE_CONFIG.MAX_WIDTH,
      maxHeight = IMAGE_CONFIG.MAX_HEIGHT,
      quality = IMAGE_CONFIG.JPEG_QUALITY,
      format = 'jpeg',
      progressive = true,
    } = options;

    // Initialize Sharp instance
    let pipeline = sharp(buffer);

    // Resize if needed (maintain aspect ratio)
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Apply format-specific optimizations
    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality,
          progressive,
          mozjpeg: true, // Use mozjpeg for better compression
        });
        break;
      
      case 'webp':
        pipeline = pipeline.webp({
          quality: options.quality || IMAGE_CONFIG.WEBP_QUALITY,
          progressive,
        });
        break;
      
      case 'png':
        pipeline = pipeline.png({
          compressionLevel: IMAGE_CONFIG.PNG_COMPRESSION,
          progressive,
        });
        break;
    }

    // Process the image
    const processedBuffer = await pipeline.toBuffer();
    const processedSize = processedBuffer.length;
    
    // Get final metadata
    const finalMetadata = await getImageMetadata(processedBuffer);
    
    return {
      success: true,
      buffer: processedBuffer,
      metadata: {
        width: finalMetadata?.width || 0,
        height: finalMetadata?.height || 0,
        format: finalMetadata?.format || format,
        size: processedSize,
        originalSize,
        compressionRatio: Math.round(((originalSize - processedSize) / originalSize) * 100),
      },
    };
  } catch (error) {
    console.error('Image optimization error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image processing failed',
    };
  }
}

/**
 * Create thumbnail version of image
 */
export async function createThumbnail(
  buffer: Buffer,
  width: number = IMAGE_CONFIG.THUMBNAIL_WIDTH,
  height: number = IMAGE_CONFIG.THUMBNAIL_HEIGHT
): Promise<ProcessingResult> {
  try {
    const thumbnailBuffer = await sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({
        quality: IMAGE_CONFIG.JPEG_QUALITY,
        progressive: true,
      })
      .toBuffer();

    const metadata = await getImageMetadata(thumbnailBuffer);
    
    return {
      success: true,
      buffer: thumbnailBuffer,
      metadata: {
        width: metadata?.width || width,
        height: metadata?.height || height,
        format: 'jpeg',
        size: thumbnailBuffer.length,
        originalSize: buffer.length,
        compressionRatio: Math.round(((buffer.length - thumbnailBuffer.length) / buffer.length) * 100),
      },
    };
  } catch (error) {
    console.error('Thumbnail creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Thumbnail creation failed',
    };
  }
}

/**
 * Convert image to different format
 */
export async function convertImageFormat(
  buffer: Buffer,
  targetFormat: 'jpeg' | 'webp' | 'png'
): Promise<ProcessingResult> {
  return optimizeImage(buffer, { format: targetFormat });
}

/**
 * Validate image buffer
 */
export async function validateImageBuffer(buffer: Buffer): Promise<{
  valid: boolean;
  error?: string;
  metadata?: ReturnType<typeof getImageMetadata> extends Promise<infer T> ? T : never;
}> {
  try {
    const metadata = await getImageMetadata(buffer);
    
    if (!metadata) {
      return {
        valid: false,
        error: 'Invalid image format or corrupted file',
      };
    }

    // Check minimum dimensions
    if (metadata.width < 100 || metadata.height < 100) {
      return {
        valid: false,
        error: 'Image too small. Minimum size is 100x100 pixels',
      };
    }

    // Check maximum dimensions
    if (metadata.width > 5000 || metadata.height > 5000) {
      return {
        valid: false,
        error: 'Image too large. Maximum size is 5000x5000 pixels',
      };
    }

    return {
      valid: true,
      metadata,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Unable to process image file',
    };
  }
}

/**
 * Calculate optimal compression settings based on file size
 */
export function calculateOptimalSettings(fileSize: number): ImageProcessingOptions {
  if (fileSize > 3 * 1024 * 1024) { // > 3MB
    return {
      maxWidth: 1600,
      maxHeight: 900,
      quality: 70,
      format: 'webp',
    };
  } else if (fileSize > 1024 * 1024) { // > 1MB
    return {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 80,
      format: 'webp',
    };
  } else {
    return {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 85,
      format: 'jpeg',
    };
  }
}

/**
 * Batch process multiple images
 */
export async function batchOptimizeImages(
  images: { buffer: Buffer; filename: string }[],
  options?: ImageProcessingOptions
): Promise<{ filename: string; result: ProcessingResult }[]> {
  const results = await Promise.allSettled(
    images.map(async ({ buffer, filename }) => {
      const result = await optimizeImage(buffer, options);
      return { filename, result };
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        filename: images[index].filename,
        result: {
          success: false,
          error: `Batch processing failed: ${result.reason}`,
        },
      };
    }
  });
}
