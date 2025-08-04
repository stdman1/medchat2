// components/AuthModal.tsx
'use client';

import { useState } from 'react';

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

export default function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (data.success) {
        onLogin(data.user);
        onClose();
        setEmail('');
        setPassword('');
      } else {
        setError(data.error);
      }
    } catch (_) {
      setError('Có lỗi xảy ra. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setEmail('');
    setPassword('');
  };

  if (!isOpen) return null;

  return (
    <div className="ocean-auth-overlay">
      <div className="ocean-auth-backdrop" onClick={onClose}></div>
      <div className="ocean-auth-modal">
        {/* Header */}
        <div className="ocean-auth-header">
          <div className="ocean-auth-icon">
            <i className="fas fa-user-md"></i>
          </div>
          <h2 className="ocean-auth-title">
            {isLoginMode ? 'Đăng nhập' : 'Tạo tài khoản'}
          </h2>
          <p className="ocean-auth-subtitle">
            {isLoginMode ? 'Chào mừng bạn quay trở lại!' : 'Tham gia cùng MedChat AI ngay hôm nay'}
          </p>
          <button className="ocean-auth-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div className="ocean-auth-body">
          {error && (
            <div className="ocean-auth-error">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="ocean-auth-form">
            <div className="ocean-form-group">
              <label className="ocean-form-label">
                <i className="fas fa-envelope"></i>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ocean-form-input"
                placeholder="example@email.com"
                required
                disabled={loading}
              />
            </div>

            <div className="ocean-form-group">
              <label className="ocean-form-label">
                <i className="fas fa-lock"></i>
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ocean-form-input"
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
              {!isLoginMode && (
                <p className="ocean-form-hint">
                  <i className="fas fa-info-circle"></i>
                  Mật khẩu phải có ít nhất 6 ký tự
                </p>
              )}
            </div>

            <button type="submit" disabled={loading} className="ocean-auth-submit">
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <i className={`fas ${isLoginMode ? 'fa-sign-in-alt' : 'fa-user-plus'}`}></i>
                  {isLoginMode ? 'Đăng nhập' : 'Đăng ký'}
                </>
              )}
            </button>
          </form>

          <div className="ocean-auth-switch">
            <p>
              {isLoginMode ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
              <button onClick={switchMode} className="ocean-auth-switch-btn" disabled={loading}>
                {isLoginMode ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>
            </p>
          </div>

          <div className="ocean-auth-features">
            <div className="ocean-feature-item">
              <i className="fas fa-save"></i>
              <span>Lưu lịch sử chat</span>
            </div>
            <div className="ocean-feature-item">
              <i className="fas fa-user-circle"></i>
              <span>Hồ sơ cá nhân</span>
            </div>
            <div className="ocean-feature-item">
              <i className="fas fa-shield-alt"></i>
              <span>Bảo mật cao</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Modal Base */
        .ocean-auth-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          backdrop-filter: blur(10px);
          animation: fade-in 0.3s ease;
        }
        .ocean-auth-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          cursor: pointer;
        }
        .ocean-auth-modal {
          position: relative;
          width: 100%;
          max-width: 420px;
          max-height: 90vh;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 249, 255, 0.95));
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(14, 165, 233, 0.2), 0 8px 32px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          overflow: hidden;
          animation: modal-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          flex-direction: column;
        }

        /* Header - 40% smaller */
        .ocean-auth-header {
          padding: 16px 16px 12px;
          text-align: center;
          background: linear-gradient(135deg, var(--ocean-blue), var(--ocean-teal));
          color: white;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        .ocean-auth-icon {
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 8px;
          font-size: 16px;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.3);
        }
        .ocean-auth-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .ocean-auth-subtitle {
          font-size: 12px;
          opacity: 0.9;
          margin: 0;
        }
        .ocean-auth-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 28px;
          height: 28px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          font-size: 13px;
        }
        .ocean-auth-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        /* Body */
        .ocean-auth-body {
          padding: 28px;
          flex: 1;
          overflow-y: auto;
        }
        .ocean-auth-error {
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          color: #dc2626;
          padding: 14px;
          border-radius: 12px;
          margin-bottom: 20px;
          border: 1px solid #fecaca;
          font-size: 14px;
        }

        /* Form */
        .ocean-auth-form { margin-bottom: 20px; }
        .ocean-form-group { margin-bottom: 18px; }
        .ocean-form-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 7px;
        }
        .ocean-form-input {
          width: 100%;
          padding: 14px 18px;
          border: 2px solid rgba(14, 165, 233, 0.1);
          border-radius: 12px;
          font-size: 15.5px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          outline: none;
        }
        .ocean-form-input:focus {
          border-color: var(--ocean-blue);
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
          background: white;
        }
        .ocean-form-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .ocean-form-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 5px;
        }

        /* Submit Button */
        .ocean-auth-submit {
          width: 100%;
          padding: 14px 22px;
          background: linear-gradient(135deg, var(--ocean-blue), var(--ocean-teal));
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .ocean-auth-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(14, 165, 233, 0.3);
        }
        .ocean-auth-submit:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

        /* Switch & Features */
        .ocean-auth-switch {
          text-align: center;
          padding: 18px 0;
          border-top: 1px solid rgba(14, 165, 233, 0.1);
          margin-bottom: 18px;
        }
        .ocean-auth-switch p { margin: 0; color: var(--text-secondary); font-size: 14px; }
        .ocean-auth-switch-btn {
          background: none;
          border: none;
          color: var(--ocean-blue);
          font-weight: 600;
          cursor: pointer;
          margin-left: 6px;
          text-decoration: underline;
          text-decoration-color: transparent;
          transition: all 0.2s ease;
          font-size: 14px;
        }
        .ocean-auth-switch-btn:hover:not(:disabled) { text-decoration-color: var(--ocean-blue); }

        .ocean-auth-features {
          display: flex;
          justify-content: space-around;
          gap: 14px;
        }
        .ocean-feature-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--text-secondary);
          text-align: center;
        }
        .ocean-feature-item i { font-size: 18px; color: var(--ocean-blue); }

        /* Animations */
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Mobile */
        @media (max-width: 480px) {
          .ocean-auth-modal { max-width: 360px; margin: 0 10px; max-height: 85vh; }
          .ocean-auth-header { padding: 12px 12px 8px; }
          .ocean-auth-body { padding: 22px; }
          .ocean-auth-icon { width: 32px; height: 32px; font-size: 14px; }
          .ocean-auth-title { font-size: 16px; }
          .ocean-auth-subtitle { font-size: 11px; }
          .ocean-auth-close { top: 8px; right: 8px; width: 24px; height: 24px; font-size: 11px; }
          .ocean-auth-features { flex-direction: column; gap: 10px; }
          .ocean-feature-item { flex-direction: row; justify-content: flex-start; text-align: left; }
        }
      `}</style>
    </div>
  );
}