import type { LucideIcon } from 'lucide-react';
import {
  ClipboardCheck,
  HardHat,
  LayoutDashboard,
  Map,
  Settings,
  ShieldCheck,
  FilePen,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/constants/routes';
import type { Rol } from '@/types/auth';

const ETIQUETA_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  coordinador: 'Coordinador',
  moderador: 'Moderador',
  ingeniero_a: 'Ingeniero nivel A',
  ingeniero_b: 'Ingeniero nivel B',
};

export { ETIQUETA_ROL };

function tieneRol(rol: Rol, permitidos: Rol[]) {
  return permitidos.includes(rol);
}

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  onClick?: () => void;
}

export function useStaffNavItems(): NavItem[] {
  const { usuario } = useAuth();

  const items: NavItem[] = [
    { key: 'mapa', label: 'Mapa', icon: Map, to: routes.home },
    { key: 'reportar', label: 'Reportar', icon: FilePen, to: routes.reportar },
  ];

  if (usuario) {
    if (tieneRol(usuario.rol, ['ingeniero_a', 'ingeniero_b'])) {
      items.push({ key: 'campo', label: 'Campo', icon: HardHat, to: routes.campo });
    }
    if (usuario.rol === 'ingeniero_a') {
      items.push({ key: 'revision', label: 'Revisión', icon: ClipboardCheck, to: routes.revision });
    }
    if (tieneRol(usuario.rol, ['moderador', 'admin'])) {
      items.push({ key: 'moderacion', label: 'Moderación', icon: ShieldCheck, to: routes.moderacion });
    }
    if (tieneRol(usuario.rol, ['coordinador', 'admin'])) {
      items.push({ key: 'tablero', label: 'Tablero', icon: LayoutDashboard, to: routes.tablero });
    }
    if (usuario.rol === 'admin') {
      items.push({ key: 'admin', label: 'Administración', icon: Settings, to: routes.admin });
    }
  }

  return items;
}
