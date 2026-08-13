import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../../../common/decorators/auth.decorator';
import type { RolUsuario } from '../../../common/enums/dominio.enum';
import type { UsuarioJwt } from '../../auth/interfaces/usuario-jwt.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const esPublico = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (esPublico) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = UsuarioJwt>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException({
        error: 'no_autorizado',
        mensaje: 'Debes iniciar sesión.',
      });
    }
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: UsuarioJwt }>();
    const usuario = request.user;
    if (!usuario) {
      throw new UnauthorizedException({
        error: 'no_autorizado',
        mensaje: 'Debes iniciar sesión.',
      });
    }

    if (!roles.includes(usuario.rol)) {
      throw new ForbiddenException({
        error: 'prohibido',
        mensaje: 'No tienes permiso para esta acción.',
      });
    }

    return true;
  }
}
