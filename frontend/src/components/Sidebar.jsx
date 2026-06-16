import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, ArrowRightLeft,
  LineChart, Bell, FileText, ShoppingCart,
  BrainCircuit, Sparkles, ChevronRight,
  PanelLeftClose, PanelLeftOpen,
  TrendingUp, Warehouse, ScanLine, CalendarDays,
  ClipboardCheck, Store,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/i18n';
import './Sidebar.css';

// minRole: minimum role required to see the item (undefined = everyone)
const NAV_GROUPS = [
  {
    label: 'nav.core',
    links: [
      { key: 'nav.dashboard',   icon: LayoutDashboard, path: '/dashboard' },
      { key: 'nav.products',    icon: Package,         path: '/products' },
      { key: 'nav.suppliers',   icon: Users,           path: '/suppliers' },
      { key: 'nav.movements',   icon: ArrowRightLeft,  path: '/movements' },
      { key: 'nav.forecasting', icon: LineChart,       path: '/forecasting' },
      { key: 'nav.alerts',      icon: Bell,            path: '/alerts' },
    ],
  },
  {
    label: 'nav.intelligence',
    links: [
      { key: 'nav.reorder',         icon: ShoppingCart, path: '/reorder' },
      { key: 'nav.intelligenceHub', icon: BrainCircuit, path: '/intelligence' },
      { key: 'nav.ai',              icon: Sparkles,     path: '/ai' },
      { key: 'nav.profitLoss',      icon: TrendingUp,   path: '/profit-loss' },
    ],
  },
  {
    label: 'nav.operations',
    links: [
      { key: 'nav.scanner',     icon: ScanLine,      path: '/scanner' },
      { key: 'nav.calendar',    icon: CalendarDays,  path: '/calendar' },
      { key: 'nav.stockOpname', icon: ClipboardCheck, path: '/stock-opname' },
      { key: 'nav.warehouses',  icon: Warehouse,     path: '/warehouses', minRole: 'manager' },
    ],
  },
  {
    label: 'nav.admin',
    links: [
      { key: 'nav.reports',   icon: FileText, path: '/reports' },
      { key: 'nav.ecommerce', icon: Store,    path: '/ecommerce', minRole: 'manager' },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { pathname } = useLocation();
  const { user, hasRole } = useAuth();
  const { t } = useI18n();

  // Filter links/groups by role, dropping empty groups.
  const groups = NAV_GROUPS
    .map((g) => ({
      ...g,
      links: g.links.filter((l) => !l.minRole || hasRole(l.minRole)),
    }))
    .filter((g) => g.links.length > 0);

  const avatarLetter = (user?.full_name || user?.username || '?').charAt(0).toUpperCase();

  return (
    <div className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>

      {/* ── Brand ── */}
      <div className="sidebar__brand">
        {!collapsed && (
          <>
            <div className="sidebar__logo">
              <img src="/logo.png" alt="PantauStok" className="sidebar__logo-img" />
            </div>
            <span className="sidebar__title">{t('app.name')}</span>
          </>
        )}
        <button
          className="sidebar__toggle"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar__nav">
        {groups.map((group, gi) => (
          <div key={group.label} className="sidebar__group">
            {collapsed && gi > 0 && <div className="sidebar__divider" />}

            {!collapsed && (
              <span className="sidebar__group-label">{t(group.label)}</span>
            )}

            {group.links.map((item) => {
              const Icon = item.icon;
              const label = t(item.key);
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                  title={label}
                >
                  <Icon size={18} className="sidebar__icon" />
                  {!collapsed && <span className="sidebar__link-text">{label}</span>}
                  {!collapsed && isActive && (
                    <ChevronRight size={13} className="sidebar__link-arrow" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User ── */}
      <div className="sidebar__user">
        <div className="sidebar__avatar" title={user?.username || ''}>{avatarLetter}</div>
        {!collapsed && (
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">{user?.full_name || user?.username || 'User'}</span>
            <span className="sidebar__user-role">{t(`auth.role.${user?.role || 'staff'}`)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
