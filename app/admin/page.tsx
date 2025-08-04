// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface SystemStats {
  medical_chunks: number;
  ai_articles: number;
  system_health: number;
  active_users: number;
}

interface ActivityItem {
  id: string;
  title: string;
  time: string;
  icon: string;
  type: 'success' | 'info' | 'warning';
}

interface PerformanceData {
  labels: string[];
  values: number[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats>({
    medical_chunks: 350,
    ai_articles: 25,
    system_health: 98.5,
    active_users: 1247
  });
  
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([
    { id: '1', title: 'New article generated', time: '2 minutes ago', icon: '📄', type: 'success' },
    { id: '2', title: 'File uploaded successfully', time: '15 minutes ago', icon: '☁️', type: 'info' },
    { id: '3', title: 'New user registered', time: '1 hour ago', icon: '👤', type: 'success' },
    { id: '4', title: 'System maintenance completed', time: '3 hours ago', icon: '🔧', type: 'warning' }
  ]);
  
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    values: [95, 96, 94, 98, 97, 99, 98]
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Logout function
  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...');
      await fetch('/api/admin/auth', { method: 'DELETE' });
      console.log('✅ Logout successful');
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Force redirect anyway
      window.location.href = '/admin/login';
    }
  };

  // Load real data from API
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      
      try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        
        if (data.success) {
          // Set real stats from API
          setStats(data.stats);
          setRecentActivity(data.recent_activity);
          setPerformanceData(data.performance);
        } else {
          console.error('API error:', data.error);
          // Keep mock data as fallback - already set above
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Keep mock data as fallback - already set above
      }

      setIsLoading(false);
    };

    loadDashboardData();
  }, []);

  // Apply additional styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Content Area */
      .content {
        padding: 2rem;
        background: var(--bg);
        min-height: calc(100vh - 80px);
      }

      .page-title {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 2rem;
        background: linear-gradient(45deg, var(--primary), var(--primary-darker));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      /* Cards */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .stat-card {
        background: var(--card);
        padding: 1.5rem;
        border-radius: 16px;
        border: 1px solid var(--border);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
      }

      .stat-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow);
      }

      .stat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .stat-title {
        color: var(--text);
        opacity: 0.8;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .stat-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 0.5rem;
      }

      .stat-change {
        font-size: 0.8rem;
        color: #10b981;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      /* Charts and Activity */
      .chart-container {
        background: var(--card);
        border-radius: 16px;
        padding: 1.5rem;
        border: 1px solid var(--border);
        margin-bottom: 2rem;
        backdrop-filter: blur(10px);
      }

      .chart-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: var(--text);
      }

      .activity-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid var(--border);
        transition: background 0.3s ease;
      }

      .activity-item:hover {
        background: rgba(14, 165, 233, 0.05);
      }

      .activity-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        flex-shrink: 0;
      }

      .activity-content {
        flex: 1;
      }

      .activity-title {
        font-weight: 500;
        margin-bottom: 0.25rem;
        color: var(--text);
      }

      .activity-time {
        font-size: 0.8rem;
        opacity: 0.7;
        color: var(--text);
      }

      .btn {
        padding: 0.5rem 1rem;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .btn-primary {
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
        color: white;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(14, 165, 233, 0.3);
      }

      .btn-secondary {
        background: var(--card);
        color: var(--text);
        border: 1px solid var(--border);
      }

      .btn-secondary:hover {
        background: var(--primary);
        color: white;
      }

      .btn-logout {
        background: linear-gradient(45deg, #ef4444, #dc2626);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        flex-shrink: 0;
      }

      .btn-logout:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
      }

      /* Status Badges */
      .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .status-online {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }

      .status-offline {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      .status-warning {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }

      /* Loading Animation */
      .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(14, 165, 233, 0.3);
        border-radius: 50%;
        border-top-color: var(--primary);
        animation: spin 1s ease-in-out infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Progress Bar */
      .progress-container {
        background: rgba(148, 163, 184, 0.2);
        border-radius: 10px;
        height: 8px;
        overflow: hidden;
        margin: 1rem 0;
      }

      .progress-bar {
        height: 100%;
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
        transition: width 0.3s ease;
        border-radius: 10px;
      }

      .quick-action {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1rem;
        text-align: left;
        transition: all 0.3s ease;
        cursor: pointer;
        color: var(--text);
      }

      .quick-action:hover {
        transform: scale(1.02);
        box-shadow: var(--shadow);
        background: linear-gradient(45deg, var(--primary), var(--primary-dark));
        color: white;
      }

      /* Header Layout */
      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        gap: 2rem;
      }

      .dashboard-title-section {
        flex: 1;
      }

      .dashboard-title-section .page-title {
        margin-bottom: 0.5rem;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .stats-grid {
          grid-template-columns: 1fr;
        }

        .content {
          padding: 1rem;
        }

        .main-grid {
          grid-template-columns: 1fr !important;
        }

        .quick-actions-grid {
          grid-template-columns: 1fr 1fr !important;
        }

        .dashboard-header {
          flex-direction: column;
          align-items: stretch;
          gap: 1rem;
        }

        .btn-logout {
          align-self: flex-end;
        }
      }

      @media (max-width: 480px) {
        .quick-actions-grid {
          grid-template-columns: 1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const getStatusColor = (health: number) => {
    if (health >= 95) return '#10b981';
    if (health >= 85) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusText = (health: number) => {
    if (health >= 95) return 'Excellent';
    if (health >= 85) return 'Good';
    return 'Poor';
  };

  if (isLoading) {
    return (
      <div className="content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
          <div className="loading"></div>
          <span style={{ marginLeft: '1rem', color: 'var(--text)', opacity: 0.7 }}>
            Loading dashboard data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      {/* Header with Title and Logout */}
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <h1 className="page-title">Dashboard</h1>
          <p style={{ color: 'var(--text)', opacity: 0.7, margin: 0 }}>
            {/* FIX: Escape quotes để tránh lỗi React */}
            Welcome back! Here&apos;s what&apos;s happening with your medical system.
            {stats.medical_chunks > 0 && ` Currently serving ${stats.medical_chunks} medical chunks.`}
          </p>
        </div>
        
        {/* Logout Button */}
        <button className="btn-logout" onClick={handleLogout}>
          🚪 Đăng xuất
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {/* Medical Chunks */}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Medical Chunks</div>
            <div className="stat-icon">🏥</div>
          </div>
          <div className="stat-value">{stats.medical_chunks.toLocaleString()}</div>
          <div className="stat-change">
            <span>↗</span> +12% from last month
          </div>
        </div>

        {/* AI Articles */}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">AI Articles Generated</div>
            <div className="stat-icon">🤖</div>
          </div>
          <div className="stat-value">{stats.ai_articles}</div>
          <div className="stat-change">
            <span>↗</span> +8% from last week
          </div>
        </div>

        {/* System Health */}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">System Health</div>
            <div className="stat-icon">💚</div>
          </div>
          <div className="stat-value">{stats.system_health}%</div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            fontSize: '0.8rem',
            color: getStatusColor(stats.system_health)
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(stats.system_health),
              marginRight: '8px'
            }}></div>
            <span>{getStatusText(stats.system_health)}</span>
          </div>
        </div>

        {/* Active Users */}
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-title">Active Users</div>
            <div className="stat-icon">👥</div>
          </div>
          <div className="stat-value">{stats.active_users.toLocaleString()}</div>
          <div className="stat-change">
            <span>↗</span> +23 new today
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div 
        className="main-grid"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr', 
          gap: '2rem',
          marginBottom: '2rem'
        }}
      >
        {/* Performance Chart */}
        <div className="chart-container">
          <h3 className="chart-title">System Performance</h3>
          
          {/* Simple Chart Visualization */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {performanceData.labels.map((label, index) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '3rem', 
                  fontSize: '0.875rem', 
                  color: 'var(--text)', 
                  opacity: 0.7 
                }}>
                  {label}
                </div>
                <div style={{ 
                  flex: 1, 
                  backgroundColor: 'rgba(148, 163, 184, 0.2)', 
                  borderRadius: '9999px', 
                  height: '12px', 
                  overflow: 'hidden' 
                }}>
                  <div 
                    style={{
                      height: '100%',
                      borderRadius: '9999px',
                      transition: 'width 0.5s ease',
                      width: `${performanceData.values[index]}%`,
                      background: 'linear-gradient(45deg, var(--primary), var(--primary-dark))'
                    }}
                  />
                </div>
                <div style={{ 
                  width: '3rem', 
                  fontSize: '0.875rem', 
                  fontWeight: 500, 
                  color: 'var(--text)' 
                }}>
                  {performanceData.values[index]}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="chart-container">
          <h3 className="chart-title">Recent Activity</h3>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {recentActivity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">{activity.icon}</div>
                <div className="activity-content">
                  <div className="activity-title">{activity.title}</div>
                  <div className="activity-time">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>

          <button 
            className="btn btn-secondary"
            style={{ 
              width: '100%', 
              marginTop: '1rem',
              background: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            View All Activity
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="chart-container">
        <h3 className="chart-title">Quick Actions</h3>
        
        <div 
          className="quick-actions-grid"
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem' 
          }}
        >
          <button className="quick-action">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤖</div>
            <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Generate AI Article</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>Create new medical content</div>
          </button>

          <button className="quick-action">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>☁️</div>
            <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Upload Files</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>Add medical documents</div>
          </button>

          <button className="quick-action">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗃️</div>
            <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Manage Data</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>Edit medical chunks</div>
          </button>

          <button className="quick-action">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
            <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>System Settings</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>Configure system</div>
          </button>
        </div>
      </div>
    </div>
  );
}