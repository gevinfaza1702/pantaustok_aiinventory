import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Guards routes behind authentication and (optionally) a minimum role.
 * Usage:
 *   <ProtectedRoute>           — any logged-in user
 *   <ProtectedRoute minRole="manager">  — manager or admin
 */
export default function ProtectedRoute({ children, minRole }) {
  const { isAuthenticated, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-secondary)',
      }}>
        <div className="animate-spin" style={{
          width: 28, height: 28, border: '3px solid var(--border-color)',
          borderTopColor: 'var(--accent)', borderRadius: '50%',
        }} />
        <span style={{ marginLeft: 12 }}>Memuat…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (minRole && !hasRole(minRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
