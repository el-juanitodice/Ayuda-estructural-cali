import type { Usuario } from '@/types/auth';
import { routes } from '@/constants/routes';

export function destinoPanel(usuario: Usuario): string {
  if (usuario.rol === 'admin') return routes.admin;
  if (usuario.rol === 'moderador') return routes.moderacion;
  if (usuario.rol === 'coordinador') return routes.tablero;
  if (usuario.rol === 'ingeniero_a') return routes.revision;
  if (usuario.rol === 'ingeniero_b') return routes.campo;
  return routes.home;
}
