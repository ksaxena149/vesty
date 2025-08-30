/**
 * AWS S3 Storage Service
 * Handles file uploads, downloads, and management with S3
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

// Allowed file types for image uploads
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

// File size limits (5MB max for free tier optimization)
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MIN_FILE_SIZE = 1024; // 1KB

export type AllowedFileType = typeof ALLOWED_FILE_TYPES[number];
export type AllowedExtension = typeof ALLOWED_EXTENSIONS[number];

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
  metadata?: {
    size: number;
    contentType: string;
    filename: string;
  };
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  metadata?: {
    size: number;
    type: string;
    extension: string;
  };
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  if (file.size < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: `File size too small. Minimum size is ${MIN_FILE_SIZE / 1024}KB`,
    };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type as AllowedFileType)) {
    return {
      valid: false,
      error: `File type not supported. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
    };
  }

  // Get file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return {
      valid: false,
      error: `File extension not supported. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  return {
    valid: true,
    metadata: {
      size: file.size,
      type: file.type,
      extension,
    },
  };
}

/**
 * Generate unique file key for S3 storage
 */
export function generateFileKey(originalFilename: string, userId?: string): string {
  const timestamp = Date.now();
  const uuid = uuidv4().split('-')[0]; // First part of UUID for shorter key
  const extension = originalFilename.split('.').pop();
  
  // Structure: images/userId/timestamp-uuid.extension
  const userPrefix = userId ? `${userId}/` : 'anonymous/';
  return `images/${userPrefix}${timestamp}-${uuid}.${extension}`;
}

/**
 * Upload file to S3
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      Metadata: {
        uploadedAt: new Date().toISOString(),
        ...metadata,
      },
      // Set cache control for better performance
      CacheControl: 'public, max-age=31536000', // 1 year
    });

    await s3Client.send(command);

    // Generate public URL
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return {
      success: true,
      key,
      url,
      metadata: {
        size: file.length,
        contentType,
        filename: key.split('/').pop() || '',
      },
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Generate presigned URL for secure file access
 */
export async function generatePresignedUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn,
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return null;
  }
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    return false;
  }
}

/**
 * Check if file exists in S3
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file metadata from S3
 */
export async function getFileMetadata(key: string) {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return null;
  }
}

/**
 * Upload base64 image data to S3 (for AI generated images)
 */
export async function uploadBase64ToS3(
  base64Data: string,
  filename: string,
  userId?: string
): Promise<UploadResult> {
  try {
    // Remove data URL prefix if present (data:image/png;base64,...)
    const base64Content = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Generate unique key
    const key = generateFileKey(filename, userId);
    
    // Determine content type from filename or default to PNG
    const extension = filename.split('.').pop()?.toLowerCase() || 'png';
    const contentType = extension === 'jpg' || extension === 'jpeg' 
      ? 'image/jpeg' 
      : `image/${extension}`;
    
    return await uploadToS3(buffer, key, contentType, {
      originalFilename: filename,
      source: 'ai-generated',
      userId: userId || 'anonymous',
    });
  } catch (error) {
    console.error('Base64 S3 Upload Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload File object to S3 (for user uploaded images)
 */
export async function uploadFileToS3(
  file: File,
  userId?: string
): Promise<UploadResult> {
  try {
    // Validate file first
    const validation = validateFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate unique key
    const key = generateFileKey(file.name, userId);
    
    return await uploadToS3(buffer, key, file.type, {
      originalFilename: file.name,
      source: 'user-upload',
      userId: userId || 'anonymous',
    });
  } catch (error) {
    console.error('File S3 Upload Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Validate AWS S3 configuration
 */
export function validateS3Config(): { valid: boolean; error?: string } {
  const requiredEnvVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET_NAME',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      return {
        valid: false,
        error: `Missing required environment variable: ${envVar}`,
      };
    }
  }

  return { valid: true };
}
