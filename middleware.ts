import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Chỉ bảo vệ admin routes (trừ login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const sessionCookie = request.cookies.get('admin-session')?.value;
    
    // Nếu không có session, redirect về login
    if (!sessionCookie) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Basic session validation
    if (!isValidSession(sessionCookie)) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

function isValidSession(session: string): boolean {
  if (!session || session.length < 10) return false;
  
  // Basic format check
  try {
    const parts = session.split('.');
    if (parts.length !== 2) return false;
    
    const [data] = parts;
    const timestamp = parseInt(data.split('-')[0]);
    const now = Date.now();
    const maxAge = 8 * 60 * 60 * 1000; // 8 hours
    
    return (now - timestamp) < maxAge;
  } catch {
    return false;
  }
}

export const config = {
  matcher: '/admin/:path*'
};