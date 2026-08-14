import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { UsuarioJwt } from '../../auth/interfaces/usuario-jwt.interface';
import {
  MODULE_ACCESS_KEY,
  type ModuleAccessMetadata,
} from '../decorators/module-access.decorator';
import { PermissionsService } from '../permissions.service';

type AuthRequest = Request & { user?: UsuarioJwt };

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<ModuleAccessMetadata | undefined>(
      MODULE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const user = request.user;
    if (!user?.sub) {
      throw new ForbiddenException('Not authenticated');
    }

    const map = await this.permissionsService.getPermissionMapForRole(
      user.role_id ?? null,
    );
    const row = map[meta.code];
    if (!row) {
      throw new ForbiddenException(`Unknown module: ${meta.code}`);
    }
    if (!row[meta.flag]) {
      throw new ForbiddenException(
        `Missing permission: ${meta.code} (${meta.flag})`,
      );
    }
    return true;
  }
}
