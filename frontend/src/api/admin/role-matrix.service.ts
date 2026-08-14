import { httpClient } from '@/api/http.client';
import type { RolePermissionMatrix, SetMatrixRowInput } from '@/types/roles';

export const roleMatrixService = {
  getMatrix: async (roleId: string): Promise<RolePermissionMatrix> => {
    return httpClient.get<RolePermissionMatrix>(`/roles/${roleId}/permission-matrix`);
  },

  setMatrix: async (roleId: string, rows: SetMatrixRowInput[]): Promise<RolePermissionMatrix> => {
    return httpClient.put<RolePermissionMatrix>(`/roles/${roleId}/permission-matrix`, { rows });
  },
};
