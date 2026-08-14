export interface UsuarioJwt {
  sub: string;
  email: string;
  nombre: string;
  role_id: string | null;
  role_name: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
  nombre: string;
  role_id?: string | null;
  role_name?: string | null;
}

export type PermissionFlags = {
  r: boolean;
  w: boolean;
  u: boolean;
  d: boolean;
};

export type NavModuleForUser = {
  code: string;
  name: string;
  route_path: string;
  nav_sort_order: number;
};
