import { useAuth } from '@/hooks/useAuth';
import type { PermissionFlag } from '@/types/permissions';

export function usePermissions() {
  const { usuario } = useAuth();

  const puede = (code: string, flag: PermissionFlag = 'r'): boolean => {
    if (!usuario?.permissions) return false;
    return Boolean(usuario.permissions[code]?.[flag]);
  };

  return { puede, permissions: usuario?.permissions ?? {}, navModules: usuario?.nav_modules ?? [] };
}
