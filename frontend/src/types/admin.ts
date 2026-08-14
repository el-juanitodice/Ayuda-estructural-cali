export interface UsuarioAdmin {
  id: number;
  uuid: string;
  email: string;
  nombre: string;
  role_id: string | null;
  role_name: string | null;
  telefono: string | null;
  activo: boolean;
  matricula: string | null;
  profesion: string | null;
  clave_definida: boolean;
  ultimo_acceso: string | null;
}

export interface ListarUsuariosResponse {
  usuarios: UsuarioAdmin[];
}

export interface ListarRolesResponse {
  roles: Array<{
    id: string;
    name: string;
    description: string;
    requires_engineering_credentials: boolean;
  }>;
}

export interface CrearUsuarioResponse {
  usuario: UsuarioAdmin;
  mensaje: string;
  enlace_alta?: string;
}

export interface ActualizarUsuarioPayload {
  email?: string;
  nombre?: string;
  role_id?: string;
  telefono?: string | null;
  matricula?: string | null;
  profesion?: string | null;
  activo?: boolean;
}

export interface ActualizarUsuarioResponse {
  usuario: UsuarioAdmin;
  mensaje: string;
}

export interface DesactivarUsuarioResponse {
  ok: boolean;
  mensaje: string;
}

export interface ReenviarEnlaceResponse {
  ok: boolean;
  mensaje: string;
  enlace_alta?: string;
}
