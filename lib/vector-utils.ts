import { inflate } from 'pako';

export function decompressEmbedding(compressedBuffer: Buffer): number[] {
  try {
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(compressedBuffer);
    
    // Decompress using pako (equivalent to PHP's gzuncompress)
    const decompressed = inflate(uint8Array, { to: 'string' });
    
    // Parse JSON to get the vector array
    const embedding = JSON.parse(decompressed);
    
    return embedding as number[];
  } catch (error) {
    console.error('Failed to decompress embedding:', error);
    return [];
  }
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}