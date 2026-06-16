import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { Bell, Sun, Moon, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { alertsAPI } from '../services/api';
import './Layout.css';

/** Derive a readable page title from the URL pathname */
function getPageTitle(pathname) {
  const segment = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  const map = {
    dashboard:    'Dashboard',
    products:     'Products',
    suppliers:    'Suppliers',
    movements:    'Stock Movements',
    forecasting:  'Forecasting',
    alerts:       'Alerts',
    reports:      'Reports',
    reorder:      'Smart Reorder',
    intelligence: 'Intelligence Hub',
    ai:           'AI Assistant',
  };
  return map[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

export default function Layout() {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  // Sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Dark / Light mode
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Live notification count
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);

  const fetchAlerts = useCallback(async () => {
    try {
      const r = await alertsAPI.getActive({ limit: 10, unread: true });
      setUnreadCount(r.data.length);
      setRecentAlerts(r.data.slice(0, 5));
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleMarkRead = async (id) => {
    await alertsAPI.markAsRead(id);
    fetchAlerts();
  };

  const SEVERITY_COLOR = { critical: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)' };

  return (
    <div className="layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />

      <div className="layout__main">
        {/* Topbar */}
        <header className="topbar">
          <h1 className="topbar__title">{pageTitle}</h1>

          <div className="topbar__actions">
            {/* Search */}
            <div className="topbar__search">
              <input type="text" placeholder="Search anything..." />
            </div>

            {/* Theme Toggle */}
            <button className="topbar__icon-btn" onClick={toggleTheme} title="Toggle theme">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <div className="topbar__notif-wrap">
              <button
                className="topbar__icon-btn topbar__notif-btn"
                onClick={() => setShowNotifPanel(v => !v)}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifPanel && (
                <div className="notif-panel">
                  <div className="notif-panel__header">
                    <span>Notifications</span>
                    <button onClick={() => setShowNotifPanel(false)}><X size={14} /></button>
                  </div>
                  {recentAlerts.length === 0 ? (
                    <div className="notif-panel__empty">All caught up! No unread alerts.</div>
                  ) : (
                    <div className="notif-panel__list">
                      {recentAlerts.map(a => (
                        <div key={a.id} className="notif-item">
                          <div
                            className="notif-item__dot"
                            style={{ background: SEVERITY_COLOR[a.severity] }}
                          />
                          <div className="notif-item__body">
                            <p className="notif-item__msg">{a.message}</p>
                            <span className="notif-item__time">
                              {new Date(a.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <button
                            className="notif-item__mark"
                            onClick={() => handleMarkRead(a.id)}
                            title="Mark as read"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
