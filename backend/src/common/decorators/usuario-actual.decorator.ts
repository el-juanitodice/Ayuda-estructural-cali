import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UsuarioJwt } from '../../modules/auth/interfaces/usuario-jwt.interface';

export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioJwt | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: UsuarioJwt }>();
    return request.user;
  },
);
