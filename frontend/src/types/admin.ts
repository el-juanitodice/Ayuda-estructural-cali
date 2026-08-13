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
  clave_definida: boolean;
  ultimo_acceso: string | null;
}

export interface ListarUsuariosResponse {
  usuarios: UsuarioAdmin[];
}

export interface CrearUsuarioResponse {
  usuario: {
    id: number;
    uuid: string;
    email: string;
    nombre: string;
    rol: Rol;
  };
  mensaje: string;
  enlace_alta?: string;
}
