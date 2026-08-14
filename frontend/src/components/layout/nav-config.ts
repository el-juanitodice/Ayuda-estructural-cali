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
import { MODULE_CODES } from '@/types/permissions';

const ICONO_MODULO: Record<string, LucideIcon> = {
  [MODULE_CODES.campo]: HardHat,
  [MODULE_CODES.revision]: ClipboardCheck,
  [MODULE_CODES.moderacion]: ShieldCheck,
  [MODULE_CODES.tablero]: LayoutDashboard,
  [MODULE_CODES.adminUsuarios]: Settings,
};

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

  if (usuario?.nav_modules?.length) {
    for (const mod of usuario.nav_modules) {
      items.push({
        key: mod.code,
        label: mod.name,
        icon: ICONO_MODULO[mod.code] ?? LayoutDashboard,
        to: mod.route_path,
      });
    }
  }

  return items;
}
