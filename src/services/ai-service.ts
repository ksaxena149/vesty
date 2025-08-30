import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini AI client
const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_AI_API_KEY environment variable is not set');
  throw new Error('Google AI API key is required');
}
console.log('Google AI API key loaded:', apiKey.substring(0, 10) + '...');
// AI service will use this client when implementing actual AI features
const genAI = new GoogleGenerativeAI(apiKey);

// Types for our AI service
export interface ClothingArticle {
  type: string;
  description: string;
  color?: string;
  pattern?: string;
  style?: string;
}

export interface OutfitAnalysis {
  articles: ClothingArticle[];
  overallStyle: string;
  description: string;
}

export interface PoseAnalysis {
  visibleArticles: string[];
  poseType: string;
  confidence: number;
}

export interface SwapRequest {
  outfitImageBase64: string;
  personImageBase64: string;
  filteredDescription: string;
}

export interface SwapResult {
  success: boolean;
  generatedImageUrl?: string;
  error?: string;
}

/**
 * Convert image file to base64 string (client-side version)
 */
export function imageToBase64Client(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const parts = result.split(',');
      if (parts.length < 2) {
        reject(new Error('Invalid image data format'));
        return;
      }
      const base64 = parts[1] as string; // Remove data:image/...;base64, prefix (safe after length check)
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert image file to base64 string (server-side version)
 */
export async function imageToBase64Server(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    throw new Error(`Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze outfit image to extract clothing descriptions using Gemini 2.5 Flash
 */
export async function analyzeOutfitImage(imageBase64: string): Promise<OutfitAnalysis> {
  try {
    console.log('Analyzing outfit image with Gemini 2.5 Flash...');
    
    const prompt = `Analyze this outfit image and provide detailed information about each clothing article. 
    Focus on:
    1. Type of clothing (shirt, pants, dress, jacket, shoes, accessories, etc.)
    2. Color and patterns
    3. Style and cut
    4. Material/texture if visible
    5. Overall style aesthetic
    
    Return the analysis in a structured format describing each visible clothing article in detail.
    Be specific about colors, patterns, fits, and styling details that would help recreate this look.`;

    // Use direct API call matching the documentation format
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GOOGLE_AI_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageBase64
              }
            },
            { text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Outfit analysis completed successfully');
    
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse the response to extract structured data
    const articles = parseClothingDescription(responseText);
    
    return {
      articles,
      overallStyle: extractOverallStyle(responseText),
      description: responseText
    };
  } catch (error) {
    console.error('Error analyzing outfit image:', error);
    throw new Error('Failed to analyze outfit image');
  }
}

/**
 * Analyze person image to determine what clothing articles would be visible in their pose using Gemini 2.5 Flash
 */
export async function analyzePoseForVisibleArticles(imageBase64: string): Promise<PoseAnalysis> {
  try {
    console.log('Analyzing person pose with Gemini 2.5 Flash...');
    
    const prompt = `Analyze this person's pose and body position to determine what clothing articles would be clearly visible if they were wearing different clothes.
    
    Consider:
    1. Body parts that are visible (torso, legs, arms, feet, etc.)
    2. Angle of the pose (front, side, back, three-quarter)
    3. Whether items like shoes, accessories, or specific clothing types would be visible
    4. Parts that might be obscured or not fully visible
    
    List the types of clothing articles that would be CLEARLY VISIBLE in this pose.
    Examples: "shirt", "pants", "jacket", "shoes", "hat", "necklace", "watch", etc.
    
    Respond with just the clothing types that would be visible, separated by commas.`;

    // Use direct API call matching the documentation format
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GOOGLE_AI_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageBase64
              }
            },
            { text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Pose analysis completed successfully');
    
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Pose analysis response:', responseText);
    
    const visibleArticles: string[] = responseText.toLowerCase()
      .split(',')
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 0);

    console.log('Detected visible articles:', visibleArticles);

    return {
      visibleArticles,
      poseType: extractPoseType(responseText),
      confidence: 0.85 // You might want to implement confidence scoring
    };
  } catch (error) {
    console.error('Error analyzing pose:', error);
    throw new Error('Failed to analyze person pose');
  }
}

/**
 * Filter outfit description to only include articles visible in the person's pose
 */
export function filterVisibleArticles(
  outfitAnalysis: OutfitAnalysis,
  poseAnalysis: PoseAnalysis
): string {
  const visibleArticles = outfitAnalysis.articles.filter(article => {
    return poseAnalysis.visibleArticles.some(visibleType => 
      article.type.toLowerCase().includes(visibleType) ||
      visibleType.includes(article.type.toLowerCase())
    );
  });

  // Create a detailed description of only the visible articles
  const filteredDescription = visibleArticles.map(article => {
    let desc = `${article.type}`;
    if (article.color) desc += ` in ${article.color}`;
    if (article.pattern) desc += ` with ${article.pattern} pattern`;
    if (article.style) desc += `, ${article.style} style`;
    if (article.description) desc += ` - ${article.description}`;
    return desc;
  }).join('; ');

  return filteredDescription;
}

/**
 * Generate new image using Gemini's native image generation (Nano Banana)
 * Using the same approach as your working curl command
 */
export async function generateSwappedImage(swapRequest: SwapRequest): Promise<SwapResult> {
  try {
    console.log('Starting image generation with Gemini 2.5 Flash Image Preview...');
    
    // Use direct fetch API call matching your working curl command structure
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GOOGLE_AI_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Transform this person to wear the following outfit: ${swapRequest.filteredDescription}

Instructions:
- Keep the person's exact pose, body position, and facial features unchanged
- Apply only the described clothing items that would be visible in this pose
- Maintain photorealistic quality with natural lighting and shadows
- Ensure the clothing fits naturally on the person's body
- Preserve the original image's background and composition
- Focus on seamless outfit replacement without altering the person's identity

Generate a high-quality image showing this outfit transformation.`
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: swapRequest.personImageBase64
              }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Gemini image generation result structure:', JSON.stringify(result, null, 2));

    // Look for image data in the response (similar to your curl command)
    if (result.candidates && result.candidates[0]?.content?.parts) {
      const parts = result.candidates[0].content.parts;
      
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          console.log('Found image data in response');
          return {
            success: true,
            generatedImageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
          };
        }
      }
    }

    // Check if there's text-based image data similar to your curl example
    const textResponse = JSON.stringify(result);
    const dataMatch = textResponse.match(/"data":\s*"([^"]+)"/);
    if (dataMatch) {
      console.log('Found base64 image data in text format');
      return {
        success: true,
        generatedImageUrl: `data:image/png;base64,${dataMatch[1]}`
      };
    }

    console.log('No image data found in response, providing fallback analysis...');
    return {
      success: false,
      error: `Image generation model responded but no image data found. Response structure: ${JSON.stringify(result).substring(0, 500)}...`
    };

  } catch (error) {
    console.error('Error generating image with Gemini Nano Banana:', error);
    
    // Fallback: Provide detailed analysis using Gemini 2.5 Flash
    try {
      console.log('Falling back to text-based analysis...');
      
      const fallbackPrompt = `Analyze this person's image and the outfit description: "${swapRequest.filteredDescription}". 
      
      Provide a detailed visualization description of how this person would look wearing these specific clothing items. Include:
      - How each clothing piece would fit on their body type
      - Color combinations and style matching
      - Overall aesthetic and appearance
      - Any style recommendations or adjustments`;

      const fallbackResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
        method: 'POST',
        headers: {
          'x-goog-api-key': process.env.GOOGLE_AI_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: swapRequest.personImageBase64
                }
              },
              { text: fallbackPrompt }
            ]
          }]
        })
      });

      if (fallbackResponse.ok) {
        const fallbackResult = await fallbackResponse.json();
        const description = fallbackResult.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';
        
        return {
          success: false,
          error: `Image generation failed. Style analysis: ${description}`
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in image generation'
      };
    } catch (fallbackError) {
      console.error('Fallback AI method failed:', fallbackError);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in image generation'
      };
    }
  }
}

/**
 * Complete outfit swap workflow - Simplified to 2 steps
 */
export async function performOutfitSwap(
  outfitImageBase64: string,
  personImageBase64: string
): Promise<SwapResult> {
  try {
    // Step 1: Get description of outfit using Image understanding
    console.log('Step 1: Analyzing outfit image...');
    const outfitAnalysis = await analyzeOutfitImage(outfitImageBase64);
    
    console.log('Outfit description obtained:', outfitAnalysis.description.substring(0, 200) + '...');
    
    // Step 2: Change outfit using gemini flash image generator (Nano Banana)
    console.log('Step 2: Generating outfit swap with Nano Banana...');
    const result = await generateSwappedImage({
      outfitImageBase64,
      personImageBase64,
      filteredDescription: outfitAnalysis.description // Use full outfit description
    });
    
    return result;
  } catch (error) {
    console.error('Error in outfit swap workflow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in outfit swap'
    };
  }
}

// Helper functions
function parseClothingDescription(description: string): ClothingArticle[] {
  // This is a simplified parser - you might want to use a more sophisticated approach
  // For now, we'll create a basic structure
  const articles: ClothingArticle[] = [];
  
  // Simple regex patterns to extract clothing items (currently unused in this placeholder)
  // const patterns = [
  //   /(\w+)\s*(?:shirt|blouse|top)/gi,
  //   /(\w+)\s*(?:pants|trousers|jeans)/gi,
  //   /(\w+)\s*(?:dress|gown)/gi,
  //   /(\w+)\s*(?:jacket|blazer|coat)/gi,
  //   /(\w+)\s*(?:shoes|boots|sneakers)/gi,
  //   /(\w+)\s*(?:hat|cap|beanie)/gi,
  // ];
  
  // This is a placeholder implementation
  // In a production app, you'd want more sophisticated NLP parsing
  articles.push({
    type: 'parsed from description',
    description: description.substring(0, 200) + '...'
  });
  
  return articles;
}

function extractOverallStyle(description: string): string {
  const styleKeywords = ['casual', 'formal', 'business', 'streetwear', 'elegant', 'sporty', 'vintage', 'modern'];
  const foundStyle = styleKeywords.find(style => 
    description.toLowerCase().includes(style)
  );
  return foundStyle || 'contemporary';
}

function extractPoseType(response: string): string {
  const poseTypes = ['front-facing', 'side-profile', 'three-quarter', 'back-facing'];
  const foundPose = poseTypes.find(pose => 
    response.toLowerCase().includes(pose) || 
    response.toLowerCase().includes(pose.replace('-', ' '))
  );
  return foundPose || 'front-facing';
}
