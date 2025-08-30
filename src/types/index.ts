// Core application types
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
}

export interface ImageData {
  id: number;
  userId: string;
  type: "user" | "outfit" | "result";
  url: string;
  uploadedAt: Date;
}

export interface OutfitSwap {
  id: number;
  userId: string;
  userImageId: number;
  outfitImageId: number;
  resultImageId?: number;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
}

export interface UploadResponse {
  success: boolean;
  imageId?: number;
  url?: string;
  error?: string;
}

export interface SwapResponse {
  success: boolean;
  swapId?: number;
  resultUrl?: string;
  error?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types
export interface UploadFormData {
  userImage: File;
  outfitImage: File;
}
