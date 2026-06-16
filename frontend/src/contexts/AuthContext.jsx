import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

// Role hierarchy mirrors the backend (staff < manager < admin)
const ROLE_LEVEL = { staff: 1, manager: 2, admin: 3 };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('ps_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('ps_token'));
  const [loading, setLoading] = useState(true);

  // On mount, if we have a token, validate it by fetching the current user.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const r = await authAPI.me();
        if (!cancelled) {
          setUser(r.data);
          localStorage.setItem('ps_user', JSON.stringify(r.data));
        }
      } catch {
        // interceptor handles 401; just clear here for other failures
        if (!cancelled) {
          localStorage.removeItem('ps_token');
          localStorage.removeItem('ps_user');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (username, password) => {
    const r = await authAPI.login(username, password);
    const { access_token, user: u } = r.data;
    localStorage.setItem('ps_token', access_token);
    localStorage.setItem('ps_user', JSON.stringify(u));
    setToken(access_token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ps_token');
    localStorage.removeItem('ps_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const hasRole = useCallback(
    (minRole) => {
      if (!user) return false;
      return (ROLE_LEVEL[user.role] || 0) >= (ROLE_LEVEL[minRole] || 0);
    },
    [user]
  );

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
