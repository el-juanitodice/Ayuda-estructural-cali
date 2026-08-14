export type PermissionFlag = 'r' | 'w' | 'u' | 'd';

export type PermissionFlags = Record<PermissionFlag, boolean>;

export type NavModule = {
  code: string;
  name: string;
  route_path: string;
  nav_sort_order: number;
};

/** Códigos de módulo alineados con `app_modules.code` en backend. */
export const MODULE_CODES = {
  campo: 'campo',
  revision: 'revision',
  aviso: 'aviso',
  moderacion: 'moderacion',
  tablero: 'tablero',
  adminUsuarios: 'admin_usuarios',
  adminRoles: 'admin_roles',
  adminModules: 'admin_modules',
  fotos: 'fotos',
} as const;

export type ModuleCode = (typeof MODULE_CODES)[keyof typeof MODULE_CODES];
