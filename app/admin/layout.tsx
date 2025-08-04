// app/admin/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();

  // Navigation items
  const navItems = [
    { href: '/admin', icon: '📊', label: 'Dashboard', exact: true },
    { href: '/admin/data', icon: '🗃️', label: 'Data Management' },
    { href: '/admin/content', icon: '📝', label: 'Content Manager' },
    { href: '/admin/upload', icon: '☁️', label: 'Upload Center' },
    { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
  ];

  // Get current page name for breadcrumb
  const getCurrentPageName = () => {
    const item = navItems.find(item => 
      item.exact ? pathname === item.href : pathname.startsWith(item.href)
    );
    return item?.label || 'Dashboard';
  };

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', !isDarkMode ? 'dark' : 'light');
  };

  // Initialize theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Apply global styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      :root {
        --primary: #0ea5e9;
        --primary-dark: #0284c7;
        --primary-darker: #0369a1;
        --bg-light: #f8fafc;
        --bg-dark: #0f172a;
        --card-light: rgba(255, 255, 255, 0.9);
        --card-dark: rgba(30, 41, 59, 0.9);
        --text-light: #334155;
        --text-dark: #e2e8f0;
        --border-light: rgba(148, 163, 184, 0.2);
        --border-dark: rgba(100, 116, 139, 0.3);
        --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        --glass: backdrop-filter: blur(10px);
      }

      [data-theme="dark"] {
        --bg: var(--bg-dark);
        --card: var(--card-dark);
        --text: var(--text-dark);
        --border: var(--border-dark);
      }

      [data-theme="light"] {
        --bg: var(--bg-light);
        --card: var(--card-light);
        --text: var(--text-light);
        --border: var(--border-light);
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-darker) 100%);
        min-height: 100vh;
        color: var(--text);
        transition: all 0.3s ease;
      }

      .app-container {
        display: flex;
        min-height: 100vh;
      }

      /* Sidebar */
      .sidebar {
        width: 280px;
        background: var(--card);
        border-right: 1px solid var(--border);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        position: fixed;
        height: 100vh;
        z-index: 100;
      }

      .sidebar-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border);
        text-align: center;
      }

      .logo {
        font-size: 1.5rem;
        font-weight: 700;
        background: linear-gradient(45deg, var(--primary), var(--primary-darker));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .nav-menu {
        padding: 1rem 0;
      }

      .nav-item {
        margin: 0.5rem 1rem;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        text-decoration: none;
        color: var(--text);
      }

      .nav-item:hover, .nav-item.active {
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
        color: white;
        transform: translateX(4px);
        box-shadow: var(--shadow);
      }

      .nav-icon {
        width: 20px;
        height: 20px;
        opacity: 0.8;
      }

      /* Main Content */
      .main-content {
        flex: 1;
        margin-left: 280px;
        transition: margin-left 0.3s ease;
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
      }

      .header {
        background: var(--card);
        padding: 1rem 2rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        backdrop-filter: blur(10px);
        flex-shrink: 0;
        height: 80px;
      }

      .main-content-wrapper {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        background: var(--bg);
      }

      .main-content-wrapper::-webkit-scrollbar {
        width: 8px;
      }

      .main-content-wrapper::-webkit-scrollbar-track {
        background: rgba(148, 163, 184, 0.1);
        border-radius: 10px;
      }

      .main-content-wrapper::-webkit-scrollbar-thumb {
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
        border-radius: 10px;
        border: 2px solid transparent;
        background-clip: content-box;
      }

      .main-content-wrapper::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(45deg, var(--primary-dark), var(--primary-darker));
        background-clip: content-box;
      }

      .breadcrumb {
        color: var(--text);
        opacity: 0.7;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .theme-toggle {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        color: var(--text);
      }

      .theme-toggle:hover {
        transform: scale(1.1);
        background: var(--primary);
        color: white;
      }

      .user-profile {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0.5rem 1rem;
        border-radius: 25px;
        background: var(--card);
        border: 1px solid var(--border);
        cursor: pointer;
        transition: all 0.3s ease;
        color: var(--text);
      }

      .user-profile:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow);
      }

      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .sidebar {
          transform: translateX(-100%);
        }

        .sidebar.mobile-open {
          transform: translateX(0);
        }

        .main-content {
          margin-left: 0;
        }

        .header {
          padding: 1rem;
        }

        .mobile-menu-btn {
          display: flex;
        }
      }

      .mobile-menu-btn {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        color: var(--text);
      }

      .mobile-menu-btn:hover {
        background: var(--primary);
        color: white;
      }

      .sidebar-toggle {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        color: var(--text);
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .sidebar-toggle:hover {
        background: rgba(14, 165, 233, 0.1);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside 
        className={`sidebar ${isSidebarOpen ? '' : 'w-16'}`}
        style={{
          width: isSidebarOpen ? '280px' : '64px'
        }}
      >
        {/* Logo */}
        <div className="sidebar-header">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🌊</div>
            {isSidebarOpen && (
              <h1 className="logo">Ocean Admin</h1>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="nav-menu">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon text-lg">{item.icon}</span>
                {isSidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Toggle */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="sidebar-toggle"
          >
            <span className="text-lg">{isSidebarOpen ? '◀' : '▶'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mobile-menu-btn lg:hidden"
            >
              <span className="text-lg">☰</span>
            </button>

            {/* Breadcrumb */}
            <div className="breadcrumb">
              Admin / <span style={{ opacity: 1, color: 'var(--text)' }}>{getCurrentPageName()}</span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="header-actions">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title="Toggle theme"
            >
              <span className="text-lg">{isDarkMode ? '☀️' : '🌙'}</span>
            </button>

            {/* User Profile */}
            <div className="user-profile">
              <div className="avatar">JD</div>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>John Doe</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ background: 'var(--bg)', flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}