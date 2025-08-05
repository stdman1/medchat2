// app/api/admin/upload-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToBlob, deleteImageFromBlob, isBlobUrl } from '@/lib/blob-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ImageUploadResult {
  success: boolean;
  image_url?: string;
  image_path?: string; // Keep for compatibility but will be blob URL
  file_info?: {
    name: string;
    size: number;
    type: string;
  };
  error?: string;
}

// POST - Upload image for articles using Vercel Blob
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🖼️ IMAGE UPLOAD API: Processing image upload to Vercel Blob...');

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const articleId = formData.get('articleId') as string;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No image file provided'
      }, { status: 400 });
    }

    // Validate file type
    const ALLOWED_TYPES = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: `Unsupported image type: ${file.type}. Allowed types: JPG, PNG, WebP`
      }, { status: 400 });
    }

    // Validate file size
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json({
        success: false,
        error: `Image file too large: ${sizeMB}MB (max: 5MB)`
      }, { status: 400 });
    }

    // Validate file content (basic check)
    if (file.size < 100) {
      return NextResponse.json({
        success: false,
        error: 'Invalid image file (too small)'
      }, { status: 400 });
    }

    // Additional validation: Check if it's actually an image
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    if (!isValidImageBuffer(buffer)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid image file format'
      }, { status: 400 });
    }

    // Generate article ID if not provided
    const sanitizedArticleId = articleId ? sanitizeFilename(articleId) : `upload_${Date.now()}`;

    // Upload to Vercel Blob
    const uploadResult = await uploadFileToBlob(
      file, 
      sanitizedArticleId
    );

    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: uploadResult.error || 'Failed to upload image'
      }, { status: 500 });
    }

    console.log(`✅ Image uploaded successfully to Blob: ${uploadResult.url}`);

    const result: ImageUploadResult = {
      success: true,
      image_url: uploadResult.url,
      image_path: uploadResult.url, // For compatibility - same as image_url
      file_info: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    };

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('❌ Image upload error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown image upload error'
    }, { status: 500 });
  }
}

// GET - Get image info or list images (adapted for blob storage)
export async function GET(request: NextRequest) {
  try {
    console.log('📊 IMAGE API: Getting image info...');
    
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url') || searchParams.get('filename'); // Support both params
    const list = searchParams.get('list') === 'true';
    
    if (imageUrl) {
      // Get specific image info
      if (isBlobUrl(imageUrl)) {
        // For blob URLs, we can't easily get detailed file stats
        // This is a simplified version
        return NextResponse.json({
          success: true,
          image: {
            filename: imageUrl.split('/').pop() || 'unknown',
            url: imageUrl,
            storage: 'vercel-blob',
            accessible: true,
            created: new Date().toISOString() // We don't have this info for blob
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Not a valid blob URL'
        }, { status: 400 });
      }
    } else if (list) {
      // List all images - not easily possible with blob storage
      // Would need to maintain a separate index/database
      return NextResponse.json({
        success: true,
        images: [],
        total: 0,
        message: 'Image listing not available with blob storage. Use database to track uploaded images.'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Missing url parameter or list=true'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Get image info error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get image info'
    }, { status: 500 });
  }
}

// DELETE - Delete image from Vercel Blob
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ IMAGE API: Deleting image from Vercel Blob...');
    
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url') || searchParams.get('filename'); // Support both params
    
    if (!imageUrl) {
      return NextResponse.json({
        success: false,
        error: 'Image URL is required'
      }, { status: 400 });
    }

    // Security check: ensure it's a blob URL
    if (!isBlobUrl(imageUrl)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid blob URL'
      }, { status: 400 });
    }

    // Delete from Vercel Blob
    const deleteSuccess = await deleteImageFromBlob(imageUrl);

    if (!deleteSuccess) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete image from blob storage'
      }, { status: 500 });
    }

    console.log(`✅ Image deleted from blob: ${imageUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully from blob storage',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Delete image error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete image'
    }, { status: 500 });
  }
}

// Helper functions (keep from original)

/**
 * Get file extension from filename or mime type
 */
function getFileExtension(filename: string, mimeType: string): string {
  // Try to get extension from filename first
  const filenameExt = filename.split('.').pop()?.toLowerCase();
  if (filenameExt && ['jpg', 'jpeg', 'png', 'webp'].includes(filenameExt)) {
    return filenameExt;
  }
  
  // Fall back to mime type
  const mimeTypeMap: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  
  return mimeTypeMap[mimeType] || 'jpg';
}

/**
 * Sanitize filename to prevent issues
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
    .substring(0, 50); // Limit length
}

/**
 * Basic validation to check if buffer contains image data
 */
function isValidImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 10) return false;
  
  // Check common image file signatures
  const signatures = [
    [0xFF, 0xD8, 0xFF], // JPEG
    [0x89, 0x50, 0x4E, 0x47], // PNG
    [0x52, 0x49, 0x46, 0x46], // WebP (RIFF header)
  ];
  
  return signatures.some(signature => 
    signature.every((byte, index) => buffer[index] === byte)
  );
}