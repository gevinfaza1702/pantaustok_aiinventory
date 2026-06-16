import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, ArrowRightLeft,
  LineChart, Bell, FileText, ShoppingCart,
  BrainCircuit, Sparkles, ChevronRight,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import './Sidebar.css';

const NAV_GROUPS = [
  {
    label: 'Core',
    links: [
      { name: 'Dashboard',   icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Products',    icon: Package,         path: '/products' },
      { name: 'Suppliers',   icon: Users,           path: '/suppliers' },
      { name: 'Movements',   icon: ArrowRightLeft,  path: '/movements' },
      { name: 'Forecasting', icon: LineChart,       path: '/forecasting' },
      { name: 'Alerts',      icon: Bell,            path: '/alerts' },
    ],
  },
  {
    label: 'Intelligence',
    links: [
      { name: 'Smart Reorder', icon: ShoppingCart, path: '/reorder' },
      { name: 'Analytics Hub', icon: BrainCircuit,  path: '/intelligence' },
      { name: 'AI Assistant',  icon: Sparkles,      path: '/ai' },
    ],
  },
  {
    label: 'Admin',
    links: [
      { name: 'Reports', icon: FileText, path: '/reports' },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { pathname } = useLocation();

  return (
    <div className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>

      {/* â”€â”€ Brand â”€â”€ */}
      <div className="sidebar__brand">
        {!collapsed && (
          <>
            <div className="sidebar__logo">
              <img src="/logo.png" alt="PantauStok" className="sidebar__logo-img" />
            </div>
            <span className="sidebar__title">PantauStok</span>
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

      {/* â”€â”€ Navigation â”€â”€ */}
      <nav className="sidebar__nav">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className="sidebar__group">
            {/* Divider between groups when collapsed */}
            {collapsed && gi > 0 && <div className="sidebar__divider" />}

            {/* Group label â€” only when expanded */}
            {!collapsed && (
              <span className="sidebar__group-label">{group.label}</span>
            )}

            {group.links.map(item => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                  title={item.name}   /* tooltip always â€” useful in both modes */
                >
                  <Icon size={18} className="sidebar__icon" />
                  {!collapsed && <span className="sidebar__link-text">{item.name}</span>}
                  {!collapsed && isActive && (
                    <ChevronRight size={13} className="sidebar__link-arrow" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* â”€â”€ User â”€â”€ */}
      <div className="sidebar__user">
        <div className="sidebar__avatar" title="Admin User">A</div>
        {!collapsed && (
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">Admin User</span>
            <span className="sidebar__user-role">System Admin</span>
          </div>
        )}
      </div>
    </div>
  );
}

