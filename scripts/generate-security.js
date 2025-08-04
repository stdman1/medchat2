const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function generateSecurity() {
  console.log('🔐 Generating security credentials...\n');
  
  // Dùng mật khẩu hiện tại trong .env
  const password = 'AdminMedChat2024!@';
  const hash = await bcrypt.hash(password, 12);
  console.log('Copy these to your .env.local file:');
  console.log('=====================================');
  console.log('ADMIN_PASSWORD=' + password);
  console.log('ADMIN_PASSWORD_HASH=' + hash);
  
  const jwtSecret = crypto.randomBytes(64).toString('hex');
  console.log('JWT_SECRET=' + jwtSecret);
  
  console.log('=====================================');
  console.log('✅ Security credentials generated!');
}

generateSecurity().catch(console.error);