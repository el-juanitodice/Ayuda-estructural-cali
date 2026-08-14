import { SetMetadata } from '@nestjs/common';

export type ModulePermissionFlag = 'r' | 'w' | 'u' | 'd';

export const MODULE_ACCESS_KEY = 'cali:module_access';

export interface ModuleAccessMetadata {
  code: string;
  flag: ModulePermissionFlag;
}

/** Permiso mínimo sobre el módulo (`code` en `app_modules`): r / w / u / d. */
export const ModuleAccess = (code: string, flag: ModulePermissionFlag) =>
  SetMetadata(MODULE_ACCESS_KEY, { code, flag } as ModuleAccessMetadata);
