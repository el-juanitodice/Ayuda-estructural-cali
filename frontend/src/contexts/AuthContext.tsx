import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { get } from '@/lib/api';
import { clearAccessToken, getAccessToken, onAccessTokenCleared, setAccessToken } from '@/lib/token';
import type { Usuario } from '@/types/auth';

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  entrar: (usuario: Usuario, accessToken: string) => void;
  salir: () => void;
  refrescar: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    if (!getAccessToken()) {
      setUsuario(null);
      setCargando(false);
      return;
    }
    try {
      const r = await get<{ usuario: Usuario }>('/auth/yo');
      setUsuario(r.usuario);
    } catch {
      clearAccessToken();
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  useEffect(() => onAccessTokenCleared(() => setUsuario(null)), []);

  const entrar = useCallback((u: Usuario, token: string) => {
    setAccessToken(token);
    setUsuario(u);
  }, []);

  const salir = useCallback(() => {
    clearAccessToken();
    setUsuario(null);
  }, []);

  const value = useMemo(
    () => ({ usuario, cargando, entrar, salir, refrescar }),
    [usuario, cargando, entrar, salir, refrescar],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requiere AuthProvider');
  return ctx;
}
