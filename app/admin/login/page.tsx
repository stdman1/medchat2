'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Component chứa logic sử dụng useSearchParams
function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/admin';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(redirectTo);
      } else {
        setError(data.error || 'Sai mật khẩu admin');
        setAttempts(prev => prev + 1);
        setPassword(''); // Clear password on failed attempt
      }
    } catch (_) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '40px',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.3)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '32px',
            color: 'white'
          }}>
            🛡️
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: '28px', fontWeight: '700', color: '#2d3748' }}>
            Admin Access
          </h1>
          <p style={{ margin: 0, color: '#718096', fontSize: '16px' }}>
            Nhập mật khẩu để truy cập trang quản trị
          </p>
        </div>

        {/* Security Status */}
        {attempts > 0 && (
          <div style={{
            background: attempts >= 3 ? '#fef2f2' : '#fef3cd',
            border: `1px solid ${attempts >= 3 ? '#fecaca' : '#fde68a'}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ 
              color: attempts >= 3 ? '#dc2626' : '#d97706', 
              fontWeight: '600',
              marginBottom: '4px'
            }}>
              ⚠️ {attempts >= 3 ? 'Quá nhiều lần thử sai!' : `Đã thử sai ${attempts} lần`}
            </div>
            {attempts >= 3 && (
              <div style={{ color: '#7f1d1d', fontSize: '14px' }}>
                Hãy kiểm tra lại mật khẩu
              </div>
            )}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          {error && (
            <div style={{ 
              background: '#fee2e2', 
              color: '#dc2626', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid #fecaca'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: '#2d3748', 
              fontWeight: '600',
              fontSize: '14px'
            }}>
              🔐 Mật khẩu Admin
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '16px',
                transition: 'all 0.2s ease',
                background: 'white',
                boxSizing: 'border-box'
              }}
              placeholder="Nhập mật khẩu admin..."
              required
              disabled={loading}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? '#6366f1' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: (loading || !password) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: (!password) ? 0.6 : 1
            }}
          >
            {loading ? (
              <>⏳ Đang kiểm tra...</>
            ) : (
              <>🚀 Đăng nhập</>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ 
          marginTop: '30px', 
          textAlign: 'center',
          color: '#718096',
          fontSize: '14px'
        }}>
          <p style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>ℹ️</span>
            <span>Trang này chỉ dành cho quản trị viên</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// Loading component cho Suspense
function LoginLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
        <div style={{ color: '#2d3748', fontSize: '16px' }}>Đang tải...</div>
      </div>
    </div>
  );
}

// Component chính với Suspense wrapper
export default function AdminLogin() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}