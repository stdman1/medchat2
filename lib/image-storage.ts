// lib/image-storage.ts
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// Configuration
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'articles');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const DOWNLOAD_TIMEOUT = 30000; // 30 seconds

interface DownloadResult {
  success: boolean;
  localPath?: string;
  publicUrl?: string;
  error?: string;
  fileSize?: number;
  originalUrl?: string;
}

/**
 * Download image from URL and store locally
 */
export async function downloadAndStoreImage(
  imageUrl: string, 
  articleId: string,
  customFilename?: string
): Promise<DownloadResult> {
  try {
    console.log(`🖼️ Downloading image for article ${articleId}...`);
    console.log(`📥 Source URL: ${imageUrl}`);

    // Validate URL
    if (!imageUrl || !isValidUrl(imageUrl)) {
      return {
        success: false,
        error: 'Invalid image URL provided'
      };
    }

    // Create directory if it doesn't exist
    await ensureDirectoryExists();

    // Generate filename
    const filename = customFilename || generateFilename(articleId, imageUrl);
    const localFilePath = path.join(IMAGES_DIR, filename);
    const publicUrl = `/images/articles/${filename}`;

    // Download image
    const downloadResult = await downloadImageFromUrl(imageUrl, localFilePath);
    
    if (!downloadResult.success) {
      return downloadResult;
    }

    console.log(`✅ Image downloaded successfully: ${filename}`);
    console.log(`📁 Local path: ${localFilePath}`);
    console.log(`🌐 Public URL: ${publicUrl}`);

    return {
      success: true,
      localPath: localFilePath,
      publicUrl: publicUrl,
      fileSize: downloadResult.fileSize,
      originalUrl: imageUrl
    };

  } catch (error) {
    console.error('❌ Error downloading image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown download error',
      originalUrl: imageUrl
    };
  }
}

/**
 * Download multiple images for an article
 */
export async function downloadMultipleImages(
  imageUrls: string[],
  articleId: string
): Promise<DownloadResult[]> {
  console.log(`🖼️ Downloading ${imageUrls.length} images for article ${articleId}...`);
  
  const results: DownloadResult[] = [];
  
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const customFilename = `${articleId}_${i + 1}.${getFileExtension(imageUrl)}`;
    
    try {
      const result = await downloadAndStoreImage(imageUrl, articleId, customFilename);
      results.push(result);
      
      // Small delay between downloads to be respectful
      if (i < imageUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      results.push({
        success: false,
        error: `Failed to download image ${i + 1}: ${error}`,
        originalUrl: imageUrl
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Downloaded ${successCount}/${imageUrls.length} images successfully`);
  
  return results;
}

/**
 * Clean up old images (optional maintenance function)
 */
export async function cleanupOldImages(daysOld: number = 30): Promise<{ cleaned: number; errors: number }> {
  try {
    console.log(`🧹 Starting cleanup of images older than ${daysOld} days...`);
    
    if (!existsSync(IMAGES_DIR)) {
      return { cleaned: 0, errors: 0 };
    }

    // FIX 1: Sử dụng import thay vì require
    const fs = await import('fs/promises');
    const files = await fs.readdir(IMAGES_DIR);
    
    let cleaned = 0;
    let errors = 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    for (const file of files) {
      try {
        const filePath = path.join(IMAGES_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          cleaned++;
          console.log(`🗑️ Cleaned up old image: ${file}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error cleaning up ${file}:`, error);
      }
    }

    console.log(`✅ Cleanup completed: ${cleaned} files cleaned, ${errors} errors`);
    return { cleaned, errors };

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return { cleaned: 0, errors: 1 };
  }
}

/**
 * Get image info without downloading
 */
export async function getImageInfo(imageUrl: string): Promise<{
  success: boolean;
  contentType?: string;
  contentLength?: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(imageUrl);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const request = client.request(imageUrl, { method: 'HEAD', timeout: 10000 }, (response) => {
        resolve({
          success: response.statusCode === 200,
          contentType: response.headers['content-type'],
          contentLength: parseInt(response.headers['content-length'] || '0'),
          error: response.statusCode !== 200 ? `HTTP ${response.statusCode}` : undefined
        });
      });

      request.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });

      request.on('timeout', () => {
        request.destroy();
        resolve({
          success: false,
          error: 'Request timeout'
        });
      });

      request.end();
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid URL'
      });
    }
  });
}

// Helper functions

/**
 * Ensure images directory exists
 */
async function ensureDirectoryExists(): Promise<void> {
  if (!existsSync(IMAGES_DIR)) {
    await mkdir(IMAGES_DIR, { recursive: true });
    console.log(`📁 Created images directory: ${IMAGES_DIR}`);
  }
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Generate filename for downloaded image
 */
function generateFilename(articleId: string, imageUrl: string): string {
  const extension = getFileExtension(imageUrl);
  const timestamp = Date.now();
  return `${articleId}_${timestamp}.${extension}`;
}

/**
 * Get file extension from URL
 */
function getFileExtension(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const extension = path.extname(pathname).toLowerCase();
    
    // Return extension without dot, default to jpg if not found
    if (extension && ALLOWED_EXTENSIONS.includes(extension)) {
      return extension.substring(1); // Remove the dot
    }
    
    return 'jpg'; // Default extension
  } catch {
    return 'jpg';
  }
}

/**
 * Download image from URL to local file
 */
function downloadImageFromUrl(url: string, localPath: string): Promise<DownloadResult> {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const request = client.get(url, { timeout: DOWNLOAD_TIMEOUT }, (response) => {
        // Check response status
        if (response.statusCode !== 200) {
          resolve({
            success: false,
            error: `HTTP ${response.statusCode}: ${response.statusMessage}`
          });
          return;
        }

        // Check content type
        const contentType = response.headers['content-type'] || '';
        if (!contentType.startsWith('image/')) {
          resolve({
            success: false,
            error: `Invalid content type: ${contentType}`
          });
          return;
        }

        // Check content length
        const contentLength = parseInt(response.headers['content-length'] || '0');
        if (contentLength > MAX_FILE_SIZE) {
          resolve({
            success: false,
            error: `File too large: ${contentLength} bytes (max: ${MAX_FILE_SIZE})`
          });
          return;
        }

        // Download and save file
        const chunks: Buffer[] = [];
        let downloadedBytes = 0;

        response.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          
          // Check size limit during download
          if (downloadedBytes > MAX_FILE_SIZE) {
            response.destroy();
            resolve({
              success: false,
              error: 'File size limit exceeded during download'
            });
            return;
          }
          
          chunks.push(chunk);
        });

        response.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            await writeFile(localPath, buffer);
            
            resolve({
              success: true,
              localPath: localPath,
              fileSize: buffer.length
            });
          } catch (writeError) {
            resolve({
              success: false,
              error: `Failed to write file: ${writeError}`
            });
          }
        });

        response.on('error', (error) => {
          resolve({
            success: false,
            error: `Download error: ${error.message}`
          });
        });
      });

      request.on('error', (error) => {
        resolve({
          success: false,
          error: `Request error: ${error.message}`
        });
      });

      request.on('timeout', () => {
        request.destroy();
        resolve({
          success: false,
          error: 'Download timeout'
        });
      });

    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * Delete stored image file
 */
export async function deleteStoredImage(publicUrl: string): Promise<boolean> {
  try {
    if (!publicUrl.startsWith('/images/articles/')) {
      return false;
    }

    const filename = path.basename(publicUrl);
    const filePath = path.join(IMAGES_DIR, filename);

    if (existsSync(filePath)) {
      // FIX 2: Sử dụng import thay vì require
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
      console.log(`🗑️ Deleted image: ${filename}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    return false;
  }
}

/**
 * Check if image exists locally
 */
export function imageExists(publicUrl: string): boolean {
  try {
    if (!publicUrl.startsWith('/images/articles/')) {
      return false;
    }

    const filename = path.basename(publicUrl);
    const filePath = path.join(IMAGES_DIR, filename);
    return existsSync(filePath);
  } catch {
    return false;
  }
}

// Export types for use in other files
export type { DownloadResult };