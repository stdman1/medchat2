// scripts/init-chat-db-cjs.js - CommonJS version
const { createClient } = require('@libsql/client');
const path = require('path');

async function initializeChatDatabase() {
  try {
    console.log('🔧 Initializing chat database...');
    
    // Kết nối database
    const chatDbPath = path.join(process.cwd(), 'data', 'chat.db');
    const chatDb = createClient({
      url: `file:${chatDbPath.replace(/\\/g, '/')}`
    });

    // Tạo bảng messages
    await chatDb.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        content TEXT NOT NULL,
        sender TEXT NOT NULL CHECK (sender IN ('user', 'bot', 'system')),
        isMarkdown BOOLEAN DEFAULT FALSE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tạo index để tăng tốc
    await chatDb.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_userId ON messages(userId)
    `);
    
    await chatDb.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages(createdAt)
    `);

    console.log('✅ Chat database initialized successfully!');
    console.log('📍 Location: data/chat.db');
    
    // Kiểm tra kết quả
    const result = await chatDb.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='messages'
    `);

    if (result.rows.length > 0) {
      console.log('📋 Messages table created successfully!');
      
      // Hiển thị cấu trúc bảng
      const structure = await chatDb.execute(`PRAGMA table_info(messages)`);
      console.log('📊 Table structure:');
      structure.rows.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}`);
      });
    }
    
    chatDb.close();
    return true;
    
  } catch (error) {
    console.error('❌ Error initializing chat database:', error);
    return false;
  }
}

// Chạy script
async function main() {
  console.log('🚀 Starting chat database initialization...');
  
  const success = await initializeChatDatabase();
  
  if (success) {
    console.log('✅ Setup complete!');
    process.exit(0);
  } else {
    console.log('❌ Setup failed!');
    process.exit(1);
  }
}

main();