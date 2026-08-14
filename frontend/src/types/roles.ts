export type AdminRole = {
  id: string;
  name: string;
  description: string;
};

export type AppModuleDto = {
  id: string;
  code: string;
  name: string;
  description: string;
  route_path?: string | null;
  nav_sort_order?: number;
  is_system?: boolean;
};

export type MatrixRowDto = {
  app_module: AppModuleDto;
  r: boolean;
  w: boolean;
  u: boolean;
  d: boolean;
};

export type RolePermissionMatrix = {
  role_id: string;
  rows: MatrixRowDto[];
};

export type SetMatrixRowInput = {
  app_module_id: string;
  r: boolean;
  w: boolean;
  u: boolean;
  d: boolean;
};
