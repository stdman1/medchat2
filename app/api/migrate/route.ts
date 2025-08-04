// app/api/migrate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { createCollection, uploadChunk, testQdrantConnection, getCollectionStats } from '../../../lib/qdrant-service';
import path from 'path';

export const dynamic = 'force-dynamic';

interface MigrationResult {
  success: boolean;
  message: string;
  stats?: {
    total_chunks: number;
    migrated_chunks: number;
    failed_chunks: number;
    success_rate: number;
    duration_ms: number;
  };
  error?: string;
}

// SQLite client
const dbPath = path.join(process.cwd(), 'data', 'vectors.db');
const db = createClient({
  url: `file:${dbPath.replace(/\\/g, '/')}`
});

async function checkPrerequisites(): Promise<{ success: boolean; message: string }> {
  try {
    // Check SQLite database
    const result = await db.execute('SELECT COUNT(*) as count FROM chunks');
    const count = result.rows[0]?.count as number;
    
    if (count === 0) {
      return {
        success: false,
        message: 'No chunks found in SQLite database'
      };
    }
    
    // Check Qdrant connection
    const qdrantConnected = await testQdrantConnection();
    if (!qdrantConnected) {
      return {
        success: false,
        message: 'Cannot connect to Qdrant. Check QDRANT_URL and QDRANT_API_KEY'
      };
    }
    
    return {
      success: true,
      message: `Prerequisites met. Found ${count} chunks to migrate`
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Prerequisites check failed: ${error}`
    };
  }
}

async function performMigration(): Promise<MigrationResult> {
  const startTime = Date.now();
  
  try {
    // Check prerequisites
    const prerequisiteCheck = await checkPrerequisites();
    if (!prerequisiteCheck.success) {
      return {
        success: false,
        message: prerequisiteCheck.message
      };
    }
    
    // Create collection
    const collectionCreated = await createCollection();
    if (!collectionCreated) {
      return {
        success: false,
        message: 'Failed to create Qdrant collection'
      };
    }
    
    // Get all chunks from SQLite
    const result = await db.execute('SELECT id, chunk, source, topic, risk_level FROM chunks ORDER BY id');
    const chunks = result.rows;
    
    if (chunks.length === 0) {
      return {
        success: false,
        message: 'No chunks found to migrate'
      };
    }
    
    // Migrate chunks in batches
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 5; // Smaller batches for API to avoid timeout
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      const promises = batch.map(async (chunk) => {
        try {
          const success = await uploadChunk(
            chunk.id as number,
            chunk.chunk as string,
            {
              source: chunk.source as string,
              topic: chunk.topic as string,
              risk_level: chunk.risk_level as string,
            }
          );
          
          return { success, id: chunk.id };
        } catch (error) {
          console.error(`Error migrating chunk ${chunk.id}:`, error);
          return { success: false, id: chunk.id };
        }
      });
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      });
      
      // Small delay between batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      success: true,
      message: `Migration completed successfully!`,
      stats: {
        total_chunks: chunks.length,
        migrated_chunks: successCount,
        failed_chunks: errorCount,
        success_rate: Math.round((successCount / chunks.length) * 100),
        duration_ms: duration
      }
    };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      success: false,
      message: 'Migration failed',
      error: error instanceof Error ? error.message : String(error),
      stats: {
        total_chunks: 0,
        migrated_chunks: 0,
        failed_chunks: 0,
        success_rate: 0,
        duration_ms: duration
      }
    };
  }
}

// GET - Check migration status
export async function GET() {
  try {
    // Check current Qdrant collection status
    const stats = await getCollectionStats();
    const prerequisiteCheck = await checkPrerequisites();
    
    return NextResponse.json({
      success: true,
      qdrant_stats: stats,
      prerequisites: prerequisiteCheck,
      endpoints: {
        start_migration: 'POST /api/migrate',
        check_status: 'GET /api/migrate'
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST - Start migration
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { force = false } = body;
    
    // Check if migration already completed (unless force is true)
    if (!force) {
      const stats = await getCollectionStats();
      if (stats && stats.vectors_count && stats.vectors_count > 0) {
        return NextResponse.json({
          success: false,
          message: 'Migration already completed. Use force=true to re-migrate',
          current_stats: stats
        }, { status: 400 });
      }
    }
    
    // Perform migration
    const result = await performMigration();
    
    // Close SQLite connection
    try {
      db.close();
    } catch (error) {
      console.error('Error closing SQLite connection:', error);
    }
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Migration API failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}