import { httpClient } from '@/api/http.client';
import type {
  ActualizarUsuarioPayload,
  ActualizarUsuarioResponse,
  CrearUsuarioResponse,
  DesactivarUsuarioResponse,
  ListarRolesResponse,
  ListarUsuariosResponse,
  ReenviarEnlaceResponse,
  UsuarioAdmin,
} from '@/types/admin';
import type { RolOption } from '@/types/auth';

interface CrearUsuarioInput {
  email: string;
  nombre: string;
  role_id: string;
  telefono: string | null;
  matricula: string | null;
  profesion: string | null;
}

export const adminService = {
  listarRoles: async (): Promise<RolOption[]> => {
    const r = await httpClient.get<ListarRolesResponse>('/admin/roles');
    return r.roles;
  },

  listarUsuarios: async (): Promise<UsuarioAdmin[]> => {
    const r = await httpClient.get<ListarUsuariosResponse>('/admin/usuarios');
    return r.usuarios;
  },

  crearUsuario: async (input: CrearUsuarioInput): Promise<CrearUsuarioResponse> => {
    return httpClient.post<CrearUsuarioResponse>('/admin/usuarios', input);
  },

  actualizarUsuario: async (
    id: number,
    patch: ActualizarUsuarioPayload,
  ): Promise<ActualizarUsuarioResponse> => {
    return httpClient.patch<ActualizarUsuarioResponse>(`/admin/usuarios/${id}`, patch);
  },

  desactivarUsuario: async (id: number): Promise<DesactivarUsuarioResponse> => {
    return httpClient.delete<DesactivarUsuarioResponse>(`/admin/usuarios/${id}`);
  },

  reenviarEnlace: async (id: number): Promise<ReenviarEnlaceResponse> => {
    return httpClient.post<ReenviarEnlaceResponse>(`/admin/usuarios/${id}/reenviar-enlace`);
  },
};
