import type { RolUsuario } from '../../../common/enums/dominio.enum';

export interface UsuarioJwt {
  sub: string;
  email: string;
  rol: RolUsuario;
  nombre: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  rol: RolUsuario;
  nombre: string;
}
