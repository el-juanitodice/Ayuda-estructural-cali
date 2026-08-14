import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { authService } from '@/api/auth/auth.service';
import { onAccessTokenCleared, setAccessToken } from '@/lib/token';
import type { Usuario } from '@/types/auth';

interface AuthContextValue {
  usuario: Usuario | null;
  /** `true` mientras se valida el token con `/auth/yo` (p. ej. tras F5). */
  cargando: boolean;
  entrar: (usuario: Usuario, accessToken: string) => void;
  salir: () => void;
  refrescar: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(() => Boolean(authService.getToken()));

  const refrescar = useCallback(async () => {
    if (!authService.getToken()) {
      setUsuario(null);
      setCargando(false);
      return;
    }

    setCargando(true);
    try {
      setUsuario(await authService.yo());
    } catch {
      authService.logout();
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
    setCargando(false);
  }, []);

  const salir = useCallback(() => {
    authService.logout();
    setUsuario(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ usuario, cargando, entrar, salir, refrescar }),
    [usuario, cargando, entrar, salir, refrescar],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
