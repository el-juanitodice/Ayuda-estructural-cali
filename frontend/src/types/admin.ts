import type { Rol } from '@/types/auth';

export interface UsuarioAdmin {
  id: number;
  uuid: string;
  email: string;
  nombre: string;
  rol: Rol;
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

export interface CrearUsuarioResponse {
  usuario: UsuarioAdmin;
  mensaje: string;
  enlace_alta?: string;
}

export interface ActualizarUsuarioPayload {
  email?: string;
  nombre?: string;
  rol?: Rol;
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
