import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Usuario } from '../../../database/entities/usuario.entity';
import type { JwtPayload, UsuarioJwt } from '../interfaces/usuario-jwt.interface';

/**
 * Si hay Bearer token válido, adjunta req.user; si no hay token, deja pasar (rutas públicas mixtas).
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: UsuarioJwt; headers: Record<string, string> }>();
    const extractor = ExtractJwt.fromAuthHeaderAsBearerToken();
    const token = extractor(req);
    if (!token) return true;

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('jwt.secret'),
      });
      const usuario = await this.usuariosRepo.findOne({
        where: { uuid: payload.sub, activo: true },
        relations: { role: true },
      });
      if (usuario?.hashClave) {
        req.user = {
          sub: usuario.uuid,
          email: usuario.email,
          nombre: usuario.nombre,
          role_id: usuario.roleId ?? null,
          role_name: usuario.role?.name ?? null,
        };
      }
    } catch {
      // Token inválido en ruta pública opcional: ignorar y tratar como anónimo
    }

    return true;
  }
}
