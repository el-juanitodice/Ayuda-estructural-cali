export type Rol =
  | 'admin'
  | 'coordinador'
  | 'moderador'
  | 'ingeniero_a'
  | 'ingeniero_b';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  matricula?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  usuario: Usuario;
}
