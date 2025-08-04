// lib/auth.ts
import crypto from 'crypto';

// ✅ Optimize: Giảm iterations và output size
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  // ✅ Giảm từ 1000 → 100 iterations, 64 → 32 bytes
  const hash = crypto.pbkdf2Sync(password, salt, 100, 32, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  // ✅ Giảm từ 1000 → 100 iterations, 64 → 32 bytes  
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100, 32, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Giữ nguyên generateRandomDisplayName
export function generateRandomDisplayName(): string {
  const adjectives = ['Thông minh', 'Tử tế', 'Dễ thương', 'Năng động', 'Sáng tạo'];
  const nouns = ['Bác sĩ', 'Chuyên gia', 'Người bạn', 'Thành viên', 'Học viên'];
  
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(Math.random() * 999) + 1;
  
  return `${randomAdj} ${randomNoun} ${randomNum}`;
}