'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface SwapResult {
  success: boolean;
  swapId?: string;
  resultImageId?: string;
  generatedImageUrl?: string;
  message?: string;
  error?: string;
}

export default function OutfitSwapTest() {
  const [outfitImage, setOutfitImage] = useState<File | null>(null);
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [outfitPreview, setOutfitPreview] = useState<string | null>(null);
  const [personPreview, setPersonPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SwapResult | null>(null);
  const [presignedImageUrl, setPresignedImageUrl] = useState<string | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'outfit' | 'person'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, or WebP images.');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (type === 'outfit') {
        setOutfitImage(file);
        setOutfitPreview(preview);
      } else {
        setPersonImage(file);
        setPersonPreview(preview);
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper function to get presigned URL for secure image access
  const getPresignedUrl = async (imageId: string, action: 'view' | 'download' = 'view'): Promise<string | null> => {
    try {
      const response = await fetch(`/api/images/presigned?imageId=${imageId}&action=${action}`);
      const data = await response.json();
      
      if (data.success) {
        return data.url;
      } else {
        console.error('Failed to get presigned URL:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Error getting presigned URL:', error);
      return null;
    }
  };

  const handleSwap = async () => {
    if (!outfitImage || !personImage) {
      toast.error('Please upload both outfit and person images.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const formData = new FormData();
      formData.append('outfitImage', outfitImage);
      formData.append('personImage', personImage);

      const response = await fetch('/api/swap', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        
        // If we have a result image ID, fetch the presigned URL for viewing
        if (data.resultImageId) {
          const viewUrl = await getPresignedUrl(data.resultImageId, 'view');
          if (viewUrl) {
            setPresignedImageUrl(viewUrl);
          }
        }
        
        toast.success('Outfit swap completed successfully!');
      } else {
        setResult({ success: false, error: data.error || 'Unknown error occurred' });
        toast.error(data.error || 'Failed to process outfit swap');
      }
    } catch (error) {
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      });
      toast.error('Failed to process outfit swap');
      console.error('Swap error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setOutfitImage(null);
    setPersonImage(null);
    setOutfitPreview(null);
    setPersonPreview(null);
    setResult(null);
    setPresignedImageUrl(null);
    setProgress(0);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Outfit Swap Test</CardTitle>
          <CardDescription>
            Upload an outfit image and your photo to see Gemini's native AI image generation in action.
            Simple 2-step process: analyze the outfit, then generate your new look with Nano Banana!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Outfit Image Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Outfit Image</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                {outfitPreview ? (
                  <div className="space-y-2">
                    <img
                      src={outfitPreview}
                      alt="Outfit preview"
                      className="max-h-48 mx-auto rounded-md"
                    />
                    <p className="text-sm text-gray-600">{outfitImage?.name}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOutfitImage(null);
                        setOutfitPreview(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <label className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700">Choose outfit image</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleFileChange(e, 'outfit')}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Person Image Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Photo</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                {personPreview ? (
                  <div className="space-y-2">
                    <img
                      src={personPreview}
                      alt="Person preview"
                      className="max-h-48 mx-auto rounded-md"
                    />
                    <p className="text-sm text-gray-600">{personImage?.name}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPersonImage(null);
                        setPersonPreview(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <label className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700">Choose your photo</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleFileChange(e, 'person')}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Processing Section */}
          {isProcessing && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Processing...</h3>
              <Progress value={progress} className="w-full" />
              <div className="text-sm text-gray-600 space-y-1">
                {progress < 50 && <p>🔍 Step 1: Analyzing outfit image...</p>}
                {progress >= 50 && progress < 90 && <p>🎨 Step 2: Generating outfit swap with Nano Banana...</p>}
                {progress >= 90 && <p>✨ Finalizing results...</p>}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleSwap}
              disabled={!outfitImage || !personImage || isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : 'Swap Outfit'}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Reset
            </Button>
          </div>

          {/* Results Section */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                {result.success ? (
                  <div className="space-y-4">
                    <p className="text-green-600 font-medium">✅ {result.message}</p>
                    {(presignedImageUrl || result.generatedImageUrl) && (
                      <div className="space-y-2">
                        <h4 className="font-semibold">Generated Image:</h4>
                        <img
                          src={presignedImageUrl || result.generatedImageUrl}
                          alt="Generated outfit swap"
                          className="max-w-full h-auto rounded-lg border"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              const imageUrl = presignedImageUrl || result.generatedImageUrl;
                              if (imageUrl) window.open(imageUrl, '_blank');
                            }}
                          >
                            View Full Size
                          </Button>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                let downloadUrl = null;
                                
                                if (result.resultImageId) {
                                  // Get presigned URL for download
                                  downloadUrl = await getPresignedUrl(result.resultImageId, 'download');
                                }
                                
                                // Fallback to current image URL
                                if (!downloadUrl) {
                                  downloadUrl = presignedImageUrl || result.generatedImageUrl;
                                }
                                
                                if (downloadUrl) {
                                  const link = document.createElement('a');
                                  link.href = downloadUrl;
                                  link.download = `outfit-swap-${result.swapId}.jpg`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                } else {
                                  toast.error('Unable to download image');
                                }
                              } catch (error) {
                                console.error('Download error:', error);
                                toast.error('Failed to download image');
                              }
                            }}
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    )}
                    {result.swapId && (
                      <p className="text-sm text-gray-600">Swap ID: {result.swapId}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-red-600 font-medium">❌ Error occurred</p>
                    <p className="text-sm text-gray-600">{result.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Section */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>🔍 <strong>Step 1:</strong> Gemini 2.5 Flash analyzes the outfit image to extract detailed clothing descriptions</p>
                <p>🎨 <strong>Step 2:</strong> Gemini 2.5 Flash Image Preview (Nano Banana) generates a new image with the outfit on your pose</p>
                <p>✨ <strong>Simplified workflow:</strong> Direct outfit transfer without complex filtering for better results</p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
