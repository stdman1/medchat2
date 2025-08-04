// app/api/admin/upload-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Image configuration
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'articles');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp'
];

interface ImageUploadResult {
  success: boolean;
  image_url?: string;
  image_path?: string;
  file_info?: {
    name: string;
    size: number;
    type: string;
  };
  error?: string;
}

// POST - Upload image for articles
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🖼️ IMAGE UPLOAD API: Processing image upload...');

    // Create images directory if it doesn't exist
    if (!existsSync(IMAGES_DIR)) {
      await mkdir(IMAGES_DIR, { recursive: true });
      console.log('📁 Created images/articles directory');
    }

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
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: `Unsupported image type: ${file.type}. Allowed types: JPG, PNG, WebP`
      }, { status: 400 });
    }

    // Validate file size
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

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = getFileExtension(file.name, file.type);
    const sanitizedArticleId = articleId ? sanitizeFilename(articleId) : `upload_${timestamp}`;
    const filename = `${sanitizedArticleId}_${timestamp}.${fileExtension}`;
    const filePath = path.join(IMAGES_DIR, filename);
    const publicUrl = `/images/articles/${filename}`;

    // Read and save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Additional validation: Check if it's actually an image
    if (!isValidImageBuffer(buffer)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid image file format'
      }, { status: 400 });
    }

    await writeFile(filePath, buffer);

    console.log(`✅ Image uploaded successfully: ${filename}`);
    console.log(`📁 Local path: ${filePath}`);
    console.log(`🌐 Public URL: ${publicUrl}`);

    const result: ImageUploadResult = {
      success: true,
      image_url: publicUrl,
      image_path: filePath,
      file_info: {
        name: filename,
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

// GET - Get image info or list images
export async function GET(request: NextRequest) {
  try {
    console.log('📊 IMAGE API: Getting image info...');
    
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const list = searchParams.get('list') === 'true';
    
    if (filename) {
      // Get specific image info
      const filePath = path.join(IMAGES_DIR, filename);
      const publicUrl = `/images/articles/${filename}`;
      
      if (!existsSync(filePath)) {
        return NextResponse.json({
          success: false,
          error: 'Image not found'
        }, { status: 404 });
      }

      const stats = await fs.stat(filePath);
      
      return NextResponse.json({
        success: true,
        image: {
          filename: filename,
          url: publicUrl,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        }
      });
    } else if (list) {
      // List all images
      if (!existsSync(IMAGES_DIR)) {
        return NextResponse.json({
          success: true,
          images: [],
          total: 0
        });
      }

      const files = await fs.readdir(IMAGES_DIR);
      const imageFiles = files.filter((file: string) => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
      });

      const images = await Promise.all(
        imageFiles.map(async (file: string) => {
          const filePath = path.join(IMAGES_DIR, file);
          const stats = await fs.stat(filePath);
          return {
            filename: file,
            url: `/images/articles/${file}`,
            size: stats.size,
            created: stats.birthtime
          };
        })
      );

      return NextResponse.json({
        success: true,
        images: images.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()),
        total: images.length
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Missing filename parameter or list=true'
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

// DELETE - Delete image
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ IMAGE API: Deleting image...');
    
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json({
        success: false,
        error: 'Filename is required'
      }, { status: 400 });
    }

    // Security check: prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid filename'
      }, { status: 400 });
    }

    const filePath = path.join(IMAGES_DIR, filename);
    
    if (!existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: 'Image not found'
      }, { status: 404 });
    }

    // Delete file
    await fs.unlink(filePath);

    console.log(`✅ Image deleted: ${filename}`);

    return NextResponse.json({
      success: true,
      message: `Image ${filename} deleted successfully`,
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

// Helper functions

/**
 * Get file extension from filename or mime type
 */
function getFileExtension(filename: string, mimeType: string): string {
  // Try to get extension from filename first
  const filenameExt = path.extname(filename).toLowerCase();
  if (filenameExt && ['.jpg', '.jpeg', '.png', '.webp'].includes(filenameExt)) {
    return filenameExt.substring(1); // Remove the dot
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