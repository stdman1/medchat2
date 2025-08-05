import { qdrant, COLLECTION_NAME } from './qdrant-service';
import { getUsedChunkIds, resetUsedChunkIds } from './news-manager';

export interface SelectedChunk {
  id: number;
  content: string;
  // FIX 1: Thay any thành Record<string, unknown>
  metadata?: Record<string, unknown>;
}

export interface ChunkSelectionResult {
  success: boolean;
  chunk: SelectedChunk | null;
  message: string;
  cycle_reset?: boolean;
}

// Lấy tổng số chunks trong collection
async function getTotalChunksCount(): Promise<number> {
  try {
    const info = await qdrant.getCollection(COLLECTION_NAME);
    return info.points_count || 0;
  } catch (error) {
    console.error('Error getting total chunks count:', error);
    return 0;
  }
}

// Lấy danh sách tất cả chunk IDs
async function getAllChunkIds(): Promise<number[]> {
  try {
    const scrollResult = await qdrant.scroll(COLLECTION_NAME, {
      limit: 10000, // Giả sử không có quá 10k chunks
      with_payload: false,
      with_vector: false
    });
    
    return scrollResult.points.map(point => Number(point.id));
  } catch (error) {
    console.error('Error getting all chunk IDs:', error);
    return [];
  }
}

// Lấy chunk theo ID cụ thể
async function getChunkById(id: number): Promise<SelectedChunk | null> {
  try {
    const points = await qdrant.retrieve(COLLECTION_NAME, {
      ids: [id],
      with_payload: true,
      with_vector: false
    });
    
    if (points.length === 0) {
      return null;
    }
    
    const point = points[0];
    return {
      id: Number(point.id),
      content: point.payload?.content as string || '',
      metadata: point.payload || {}
    };
  } catch (error) {
    console.error('Error getting chunk by ID:', error);
    return null;
  }
}

// Chọn chunk random (tránh trùng lặp)
export async function selectRandomChunk(): Promise<ChunkSelectionResult> {
  try {
    console.log('🎲 Starting smart chunk selection...');
    
    // Lấy danh sách chunks đã sử dụng
    const usedChunkIds = await getUsedChunkIds();
    console.log(`📊 Used chunks: ${usedChunkIds.length}`);
    
    // Lấy tất cả chunk IDs có sẵn
    const allChunkIds = await getAllChunkIds();
    console.log(`📊 Total chunks: ${allChunkIds.length}`);
    
    if (allChunkIds.length === 0) {
      return {
        success: false,
        chunk: null,
        message: 'No chunks found in Qdrant collection'
      };
    }
    
    // Tìm chunks chưa sử dụng
    const availableChunkIds = allChunkIds.filter(id => !usedChunkIds.includes(String(id)));
    console.log(`📊 Available chunks: ${availableChunkIds.length}`);
    
    let selectedChunkId: number;
    let cycleReset = false;
    
    // Nếu hết chunks chưa sử dụng, reset cycle
    if (availableChunkIds.length === 0) {
      console.log('🔄 All chunks used, resetting cycle...');
      const resetSuccess = await resetUsedChunkIds();
      
      if (!resetSuccess) {
        return {
          success: false,
          chunk: null,
          message: 'Failed to reset used chunks cycle'
        };
      }
      
      cycleReset = true;
      selectedChunkId = allChunkIds[Math.floor(Math.random() * allChunkIds.length)];
    } else {
      // Chọn random từ chunks chưa sử dụng
      selectedChunkId = availableChunkIds[Math.floor(Math.random() * availableChunkIds.length)];
    }
    
    console.log(`🎯 Selected chunk ID: ${selectedChunkId}`);
    
    // Lấy nội dung chunk
    const chunk = await getChunkById(selectedChunkId);
    
    if (!chunk) {
      return {
        success: false,
        chunk: null,
        message: `Chunk with ID ${selectedChunkId} not found`
      };
    }
    
    // Kiểm tra content có hợp lệ không
    if (!chunk.content || chunk.content.trim().length < 50) {
      console.log('⚠️ Selected chunk content too short, trying again...');
      // Thử chọn chunk khác (recursive call, nhưng giới hạn để tránh infinite loop)
      return await selectRandomChunk();
    }
    
    return {
      success: true,
      chunk,
      message: cycleReset 
        ? 'Selected chunk successfully (cycle reset)' 
        : 'Selected chunk successfully',
      cycle_reset: cycleReset
    };
    
  } catch (error) {
    console.error('❌ Error in selectRandomChunk:', error);
    return {
      success: false,
      chunk: null,
      message: `Error selecting chunk: ${error}`
    };
  }
}

// Lấy thống kê chunk selection
export async function getChunkSelectionStats() {
  try {
    const totalChunks = await getTotalChunksCount();
    const usedChunks = await getUsedChunkIds();
    
    return {
      total_chunks: totalChunks,
      used_chunks: usedChunks.length,
      available_chunks: totalChunks - usedChunks.length,
      usage_percentage: totalChunks > 0 ? (usedChunks.length / totalChunks * 100).toFixed(1) : '0'
    };
  } catch (error) {
    console.error('Error getting chunk selection stats:', error);
    return null;
  }
}

// Kiểm tra kết nối Qdrant
export async function testQdrantConnection(): Promise<boolean> {
  try {
    await qdrant.getCollections();
    return true;
  } catch (error) {
    console.error('Qdrant connection failed:', error);
    return false;
  }
}