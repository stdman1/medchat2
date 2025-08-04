import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const clientIP = getClientIP(request);
    
    // Basic validation
    if (!password) {
      return NextResponse.json({
        success: false,
        error: 'Vui lòng nhập mật khẩu'
      }, { status: 400 });
    }

    // Get admin credentials
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

    if (!ADMIN_PASSWORD && !ADMIN_PASSWORD_HASH) {
      console.error('❌ Admin credentials not configured');
      return NextResponse.json({
        success: false,
        error: 'Cấu hình admin chưa sẵn sàng'
      }, { status: 500 });
    }

    let isValid = false;

    // Check password - dùng plain text trước
    if (ADMIN_PASSWORD) {
      isValid = password === ADMIN_PASSWORD;
    } else if (ADMIN_PASSWORD_HASH) {
      isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    }

    if (!isValid) {
      console.warn(`🚨 Failed admin login from IP: ${clientIP}`);
      return NextResponse.json({
        success: false,
        error: 'Mật khẩu không chính xác'
      }, { status: 401 });
    }

    // SUCCESS - Generate secure session
    const sessionId = generateSecureSession();
    
    console.log(`✅ Admin login successful from IP: ${clientIP}`);

    const response = NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công!'
    });

    // Set secure cookie
    response.cookies.set('admin-session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/admin'
    });

    return response;

  } catch (error) {
    console.error('❌ Admin auth error:', error);
    return NextResponse.json({
      success: false,
      error: 'Lỗi hệ thống'
    }, { status: 500 });
  }
}

// GET - Check auth status
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('admin-session')?.value;
    
    if (!sessionId || !isValidSession(sessionId)) {
      return NextResponse.json({
        authenticated: false
      }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true
    });

  } catch (_) {
    return NextResponse.json({
      authenticated: false
    }, { status: 500 });
  }
}

// DELETE - Logout
export async function DELETE(_: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Đăng xuất thành công'
  });

  response.cookies.delete('admin-session');
  return response;
}

// Utility functions
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

function generateSecureSession(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const secret = process.env.JWT_SECRET || 'fallback';
  
  const data = `${timestamp}-${random}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
  
  return `${data}.${signature}`;
}

function isValidSession(session: string): boolean {
  try {
    const [data, signature] = session.split('.');
    if (!data || !signature) return false;
    
    // Verify signature
    const secret = process.env.JWT_SECRET || 'fallback';
    const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('hex');
    
    if (signature !== expectedSig) return false;
    
    // Check expiry
    const timestamp = parseInt(data.split('-')[0]);
    const now = Date.now();
    const maxAge = 8 * 60 * 60 * 1000; // 8 hours
    
    return (now - timestamp) < maxAge;
    
  } catch {
    return false;
  }
}