// Application constants
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGE_DIMENSION = 2048; // pixels

// API endpoints
export const API_ENDPOINTS = {
  UPLOAD: "/api/upload",
  SWAP: "/api/swap",
  HISTORY: "/api/history",
  IMAGES: "/api/images",
} as const;

// Processing states
export const PROCESSING_STATES = {
  IDLE: "idle",
  UPLOADING: "uploading",
  PROCESSING: "processing",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

// Error messages
export const ERROR_MESSAGES = {
  INVALID_FILE_TYPE: "Please upload a valid image file (JPEG, PNG, or WebP)",
  FILE_TOO_LARGE: "File size must be less than 5MB",
  UPLOAD_FAILED: "Failed to upload image. Please try again.",
  PROCESSING_FAILED: "Failed to process images. Please try again.",
  NETWORK_ERROR: "Network error. Please check your connection.",
} as const;
