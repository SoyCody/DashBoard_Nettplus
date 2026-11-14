import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, apiRequest } from '../../lib/api';

export type AppRole = 'asistente_rrhh' | 'jefe_rrhh' | 'administrador';

export type AuthUser = {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  usuario: string;
  rolId: number;
  estado: string;
  role: AppRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (usuario: string, password: string) => Promise<void>;
  logout: (expired?: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inactivityMinutes, setInactivityMinutes] = useState(30);

  useEffect(() => {
    let active = true;
    apiRequest<{ user: AuthUser | null; sessionInactivityMinutes: number }>('/auth/me')
      .then((response) => {
        if (active) {
          setUser(response.user);
          setInactivityMinutes(response.sessionInactivityMinutes);
        }
      })
      .catch((caughtError: unknown) => {
        if (active && !(caughtError instanceof ApiError && caughtError.status === 401)) {
          setError(caughtError instanceof Error ? caughtError.message : 'No se pudo validar la sesión.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async (expired = false) => {
    let logoutError: string | undefined;
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (caughtError) {
      logoutError = caughtError instanceof Error ? caughtError.message : 'No se pudo informar el cierre de sesión al servidor.';
    } finally {
      setUser(null);
      setError(logoutError ?? null);
      navigate('/login', {
        replace: true,
        state: { ...(expired ? { expired: true } : {}), ...(logoutError ? { logoutError } : {}) },
      });
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let timer = window.setTimeout(() => {
      void logout(true);
    }, inactivityMinutes * 60 * 1000);
    let lastRefresh = Date.now();

    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void logout(true);
      }, inactivityMinutes * 60 * 1000);

      if (Date.now() - lastRefresh >= 60_000) {
        lastRefresh = Date.now();
        apiRequest('/auth/refresh', { method: 'POST' }).catch((caughtError: unknown) => {
          const message = caughtError instanceof Error ? caughtError.message : 'No se pudo renovar la sesión.';
          setUser(null);
          setError(message);
          navigate('/login', {
            replace: true,
            state: caughtError instanceof ApiError && caughtError.status === 401
              ? { expired: true }
              : { logoutError: message },
          });
        });
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    activityEvents.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      window.clearTimeout(timer);
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user, inactivityMinutes, logout, navigate]);

  const login = useCallback(async (usuario: string, password: string) => {
    const response = await apiRequest<{
      user: AuthUser;
      sessionInactivityMinutes: number;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, password }),
    });
    setUser(response.user);
    setInactivityMinutes(response.sessionInactivityMinutes);
    setError(null);
  }, []);

  const value = useMemo(() => ({ user, loading, error, login, logout }), [user, loading, error, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
