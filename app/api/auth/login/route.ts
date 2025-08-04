// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma'; // ✅ Singleton
import { verifyPassword } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Kiểm tra nếu prisma client chưa được khởi tạo
    if (!prisma) {
      console.error('Prisma client not initialized');
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    // Tìm user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        password: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 400 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 400 }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Xử lý các loại lỗi khác nhau
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}