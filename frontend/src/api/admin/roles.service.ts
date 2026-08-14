import { httpClient } from '@/api/http.client';
import type { AdminRole } from '@/types/roles';

interface CreateAdminRoleInput {
  name: string;
  description: string;
}

interface UpdateAdminRoleInput {
  name: string;
  description: string;
}

export const adminRolesService = {
  getRoles: async (): Promise<AdminRole[]> => {
    return httpClient.get<AdminRole[]>('/roles');
  },

  createRole: async (input: CreateAdminRoleInput): Promise<AdminRole> => {
    return httpClient.post<AdminRole>('/roles', input);
  },

  updateRole: async (roleId: string, input: UpdateAdminRoleInput): Promise<AdminRole> => {
    return httpClient.patch<AdminRole>(`/roles/${roleId}`, input);
  },

  deleteRole: async (roleId: string): Promise<void> => {
    await httpClient.delete<Record<string, never>>(`/roles/${roleId}`);
  },
};
