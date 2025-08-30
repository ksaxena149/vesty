'use client';

import { useState, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

interface UploadResult {
  success: boolean;
  data?: {
    id: string;
    filename: string;
    url: string;
    metadata: {
      width: number;
      height: number;
      format: string;
      originalSize: number;
      optimizedSize: number;
      compressionRatio: number;
    };
  };
  error?: string;
}

export function ImageUploadTest() {
  const { isSignedIn, user } = useUser();
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Reset previous result
    setResult(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include authentication cookies
        headers: {
          // Don't set Content-Type - let browser set it for FormData
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        error: 'Network error occurred during upload',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isSignedIn) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            Authentication Required
          </h2>
          <p className="text-yellow-700">
            Please sign in to test the image upload functionality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            AWS S3 Upload Test
          </h2>
          <p className="text-gray-600 mb-6">
            Test the image upload functionality with AWS S3 integration.
            Supported formats: JPEG, PNG, WebP (max 5MB)
          </p>

          {/* User Debug Info */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
            <p><strong>Debug Info:</strong></p>
            <p>Signed in: {isSignedIn ? '✅ Yes' : '❌ No'}</p>
            <p>User: {user?.firstName || 'Unknown'} ({user?.id || 'No ID'})</p>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileInput}
              className="hidden"
              disabled={uploading}
            />

            <div className="space-y-4">
              <div className="text-6xl">📸</div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {dragOver ? 'Drop your image here' : 'Choose an image to upload'}
                </p>
                <p className="text-sm text-gray-500">
                  Drag and drop or click to select
                </p>
              </div>
              <button
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={uploading}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                {uploading ? 'Uploading...' : 'Select Image'}
              </button>
            </div>
          </div>

          {/* Loading State */}
          {uploading && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-blue-600 font-medium">
                  Processing and uploading your image...
                </span>
              </div>
            </div>
          )}

          {/* Results */}
          {result && !uploading && (
            <div className="mt-6">
              {result.success ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      ✅ Upload Successful!
                    </h3>
                    <p className="text-green-700">
                      Your image has been successfully uploaded and optimized.
                    </p>
                  </div>

                  {result.data && (
                    <div className="space-y-4">
                      {/* Image Preview */}
                      <div className="border rounded-lg overflow-hidden">
                        <img
                          src={result.data.url}
                          alt={result.data.filename}
                          className="w-full max-w-md mx-auto h-auto"
                        />
                      </div>

                      {/* Metadata */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3">Image Details</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Filename:</span>
                            <div className="font-medium">{result.data.filename}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Format:</span>
                            <div className="font-medium uppercase">{result.data.metadata.format}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Dimensions:</span>
                            <div className="font-medium">
                              {result.data.metadata.width} × {result.data.metadata.height}px
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Original Size:</span>
                            <div className="font-medium">{formatFileSize(result.data.metadata.originalSize)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Optimized Size:</span>
                            <div className="font-medium">{formatFileSize(result.data.metadata.optimizedSize)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Compression:</span>
                            <div className="font-medium text-green-600">
                              -{result.data.metadata.compressionRatio}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    ❌ Upload Failed
                  </h3>
                  <p className="text-red-700">
                    {result.error || 'An unknown error occurred during upload.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}