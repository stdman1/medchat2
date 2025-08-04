import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ SINGLETON PATTERN - Chỉ tạo 1 connection duy nhất
const globalForQdrant = globalThis as unknown as {
  qdrant: QdrantClient | undefined;
};

const qdrant = globalForQdrant.qdrant ?? new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
  timeout: 15000,
});

if (process.env.NODE_ENV !== 'production') {
  globalForQdrant.qdrant = qdrant;
}

const COLLECTION_NAME = 'medical_chunks';

// ✅ EXPORT để dùng chung
export { qdrant, COLLECTION_NAME };

interface QdrantSearchResult {
  id: number;
  score: number;
  content: string;
}

interface RAGResult {
  success: boolean;
  fallback_needed: boolean;
  context: Array<{
    id: number;
    score: number;
    content: string;
  }>;
}

// Tạo collection (chạy 1 lần)
export async function createCollection(): Promise<boolean> {
  try {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 3072, // text-embedding-3-large dimension
        distance: 'Cosine'
      },
      optimizers_config: {
        default_segment_number: 2,
      },
      replication_factor: 1,
    });
    console.log('✅ Qdrant collection created successfully');
    return true;
  // FIX 1: Thay any thành unknown
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('already exists')) {
      console.log('✅ Collection already exists');
      return true;
    }
    console.error('❌ Failed to create collection:', error);
    return false;
  }
}

// Kiểm tra collection có tồn tại không
export async function checkCollection(): Promise<boolean> {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      // FIX 2: Thay any thành proper type
      (collection: { name: string }) => collection.name === COLLECTION_NAME
    );
    
    if (!exists) {
      console.log('🔄 Collection not found, creating...');
      return await createCollection();
    }
    
    console.log('✅ Collection exists');
    return true;
  } catch (error) {
    console.error('❌ Error checking collection:', error);
    return false;
  }
}

// Upload một chunk lên Qdrant
export async function uploadChunk(
  id: number,
  content: string,
  // FIX 3: Thay any thành Record<string, unknown>
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  try {
    // Tạo embedding cho content
    const embeddingResponse = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
      input: content,
    });
    
    const vector = embeddingResponse.data[0].embedding;
    
    // Upload lên Qdrant
    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: id,
          vector: vector,
          payload: {
            content: content,
            ...metadata
          }
        }
      ]
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to upload chunk:', error);
    return false;
  }
}

// Tìm kiếm vector nhanh
export async function searchVectors(query: string): Promise<QdrantSearchResult[]> {
  try {
    // Tạo embedding cho query
    const embeddingResponse = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
      input: query,
    });
    
    const queryVector = embeddingResponse.data[0].embedding;
    
    // Tìm kiếm trong Qdrant
    const searchResult = await qdrant.search(COLLECTION_NAME, {
      vector: queryVector,
      limit: 5,
      score_threshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.5'),
    });
    
    // Chuyển đổi kết quả
    return searchResult.map(result => ({
      id: result.id as number,
      score: result.score,
      content: result.payload?.content as string || '',
    }));
    
  } catch (error) {
    console.error('❌ Qdrant search error:', error);
    return [];
  }
}

// Thay thế cho hàm retrieveContext cũ
export async function retrieveContextFast(query: string): Promise<RAGResult> {
  try {
    // Kiểm tra collection trước
    const collectionExists = await checkCollection();
    if (!collectionExists) {
      return {
        success: false,
        fallback_needed: true,
        context: []
      };
    }
    
    // Tìm kiếm
    const results = await searchVectors(query);
    
    // Chuyển đổi kết quả theo format cũ
    const context = results.map(result => ({
      id: result.id,
      score: Math.round(result.score * 1000000) / 1000000,
      content: result.content.length > 1000 
        ? result.content.substring(0, 1000) + '... [truncated]'
        : result.content
    }));
    
    return {
      success: true,
      fallback_needed: context.length === 0,
      context: context.slice(0, 2) // Top 2 results
    };
    
  } catch (error) {
    console.error('❌ Fast retrieval error:', error);
    return {
      success: false,
      fallback_needed: true,
      context: []
    };
  }
}

// Lấy thống kê collection
export async function getCollectionStats() {
  try {
    const info = await qdrant.getCollection(COLLECTION_NAME);
    return {
      vectors_count: info.vectors_count,
      indexed_vectors_count: info.indexed_vectors_count,
      points_count: info.points_count,
      status: info.status
    };
  } catch (error) {
    console.error('❌ Error getting stats:', error);
    return null;
  }
}

// Hàm retrieveContext (chính) - thay thế rag-service
export async function retrieveContext(query: string, translatedQuery?: string): Promise<RAGResult> {
  try {
    // Sử dụng translated query nếu có
    const searchQuery = translatedQuery || query;
    
    // Gọi hàm tìm kiếm nhanh
    return await retrieveContextFast(searchQuery);
    
  } catch (error) {
    console.error('❌ Qdrant retrieveContext error:', error);
    return {
      success: false,
      fallback_needed: true,
      context: []
    };
  }
}

// Lấy thông tin collection
export async function getCollectionInfo() {
  try {
    const info = await qdrant.getCollection(COLLECTION_NAME);
    return {
      name: COLLECTION_NAME,
      vectors_count: info.vectors_count,
      indexed_vectors_count: info.indexed_vectors_count,
      points_count: info.points_count,
      status: info.status
    };
  } catch (error) {
    console.error('❌ Error getting collection info:', error);
    return null;
  }
}

// Test kết nối Qdrant
export async function testQdrantConnection(): Promise<boolean> {
  try {
    console.log('🔄 Testing Qdrant connection...');
    
    // Lấy danh sách collections
    const collections = await qdrant.getCollections();
    
    console.log('✅ Qdrant connection successful');
    console.log(`📊 Found ${collections.collections.length} collections`);
    
    return true;
  } catch (error) {
    console.error('❌ Qdrant connection failed:', error);
    return false;
  }
}