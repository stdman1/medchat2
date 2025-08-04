import { createClient } from '@libsql/client';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'vectors.db');

export const db = createClient({
  url: `file:${dbPath.replace(/\\/g, '/')}`
});

export interface Chunk {
  id: number;
  hash: string;
  chunk: string;
  embedding: Buffer;
  source: string;
  topic: string;
  risk_level: string;
  update_date: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export async function getAllChunks(): Promise<Chunk[]> {
  const result = await db.execute('SELECT * FROM chunks');
  return result.rows.map(row => ({
    id: row.id as number,
    hash: row.hash as string,
    chunk: row.chunk as string,
    embedding: Buffer.from(row.embedding as ArrayBuffer),
    source: row.source as string,
    topic: row.topic as string,
    risk_level: row.risk_level as string,
    update_date: row.update_date as string,
    word_count: row.word_count as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }));
}

export async function getChunkById(id: number): Promise<Chunk | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM chunks WHERE id = ?',
    args: [id]
  });
  
  const row = result.rows[0];
  if (!row) return null;
  
  return {
    id: row.id as number,
    hash: row.hash as string,
    chunk: row.chunk as string,
    embedding: Buffer.from(row.embedding as ArrayBuffer),
    source: row.source as string,
    topic: row.topic as string,
    risk_level: row.risk_level as string,
    update_date: row.update_date as string,
    word_count: row.word_count as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}