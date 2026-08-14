import type { Usuario } from '@/types/auth';
import { routes } from '@/constants/routes';

export function destinoPanel(usuario: Usuario): string {
  const firstNav = usuario.nav_modules?.[0]?.route_path;
  if (firstNav) return firstNav;
  return routes.home;
}
