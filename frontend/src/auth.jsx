import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, getToken, setToken, clearToken } from './api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('clms:logout', onLogout);
    if (getToken()) {
      api('/auth/me').then(setUser).catch(() => clearToken()).finally(() => setReady(true));
    } else setReady(true);
    return () => window.removeEventListener('clms:logout', onLogout);
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    isStaff: user && (user.role === 'LIBRARIAN' || user.role === 'ADMIN'),
    isAdmin: user && user.role === 'ADMIN',
    async login(identifier, password) {
      const res = await api('/auth/login', { method: 'POST', body: { identifier, password } });
      setToken(res.token);
      setUser(res.user);
      return res.user;
    },
    logout() { clearToken(); setUser(null); }
  }), [user, ready]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function RequireRole({ roles, children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}
