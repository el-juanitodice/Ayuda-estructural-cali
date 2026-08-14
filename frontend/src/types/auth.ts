import type { NavModule, PermissionFlags } from '@/types/permissions';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  matricula?: string | null;
  role_id?: string | null;
  role_name?: string | null;
  permissions?: Record<string, PermissionFlags>;
  nav_modules?: NavModule[];
}

export interface RolOption {
  id: string;
  name: string;
  description: string;
  requires_engineering_credentials: boolean;
}
