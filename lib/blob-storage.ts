// lib/blob-storage.ts
import { put, del } from '@vercel/blob';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  originalUrl?: string;
}

/**
 * Upload image to Vercel Blob storage
 */
export async function uploadImageToBlob(
  imageUrl: string, 
  articleId: string,
  customFilename?: string
): Promise<UploadResult> {
  try {
    console.log(`🖼️ Uploading image to Vercel Blob for article ${articleId}...`);
    console.log(`📥 Source URL: ${imageUrl}`);

    // Download image from URL
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get image as blob
    const imageBlob = await response.blob();
    
    // Generate filename
    const filename = customFilename || generateFilename(articleId, imageUrl);
    
    // Upload to Vercel Blob
    const blob = await put(`articles/${filename}`, imageBlob, {
      access: 'public',
      contentType: imageBlob.type
    });

    console.log(`✅ Image uploaded successfully: ${blob.url}`);
    
    return {
      success: true,
      url: blob.url,
      originalUrl: imageUrl
    };

  } catch (error) {
    console.error('❌ Error uploading image to blob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
      originalUrl: imageUrl
    };
  }
}

/**
 * Upload file from FormData to Vercel Blob
 */
export async function uploadFileToBlob(
  file: File,
  articleId: string
): Promise<UploadResult> {
  try {
    console.log(`📁 Uploading file to Vercel Blob for article ${articleId}...`);
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPG, PNG, WebP are allowed.');
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }

    // Generate filename
    const extension = getFileExtension(file.name);
    const filename = `${articleId}_${Date.now()}.${extension}`;
    
    // Upload to Vercel Blob
    const blob = await put(`articles/${filename}`, file, {
      access: 'public',
      contentType: file.type
    });

    console.log(`✅ File uploaded successfully: ${blob.url}`);
    
    return {
      success: true,
      url: blob.url
    };

  } catch (error) {
    console.error('❌ Error uploading file to blob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

/**
 * Delete image from Vercel Blob storage
 */
export async function deleteImageFromBlob(url: string): Promise<boolean> {
  try {
    if (!url.includes('blob.vercel-storage.com')) {
      console.warn('URL is not a Vercel Blob URL, skipping deletion');
      return false;
    }

    await del(url);
    console.log(`🗑️ Deleted image from blob: ${url}`);
    return true;

  } catch (error) {
    console.error('❌ Error deleting image from blob:', error);
    return false;
  }
}

/**
 * Generate filename for uploaded image
 */
function generateFilename(articleId: string, imageUrl: string): string {
  const extension = getFileExtension(imageUrl);
  const timestamp = Date.now();
  return `${articleId}_${timestamp}.${extension}`;
}

/**
 * Get file extension from URL or filename
 */
function getFileExtension(url: string): string {
  const defaultExt = 'jpg';
  
  try {
    const urlPath = new URL(url).pathname;
    const match = urlPath.match(/\.([a-zA-Z0-9]+)$/);
    
    if (match) {
      const ext = match[1].toLowerCase();
      const validExts = ['jpg', 'jpeg', 'png', 'webp'];
      return validExts.includes(ext) ? ext : defaultExt;
    }
    
    return defaultExt;
  } catch {
    // If URL parsing fails, try to extract from filename
    const match = url.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : defaultExt;
  }
}

/**
 * Check if URL is a Vercel Blob URL
 */
export function isBlobUrl(url: string): boolean {
  return url.includes('blob.vercel-storage.com');
}

// Export types
export type { UploadResult };