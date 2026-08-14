import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Usuario } from '../../../database/entities/usuario.entity';
import type { JwtPayload, UsuarioJwt } from '../interfaces/usuario-jwt.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<UsuarioJwt> {
    const usuario = await this.usuariosRepo.findOne({
      where: { uuid: payload.sub, activo: true },
      relations: { role: true },
    });

    if (!usuario || !usuario.hashClave) {
      throw new UnauthorizedException({
        error: 'no_autorizado',
        mensaje: 'Sesión inválida o usuario inactivo.',
      });
    }

    return {
      sub: usuario.uuid,
      email: usuario.email,
      nombre: usuario.nombre,
      role_id: usuario.roleId ?? null,
      role_name: usuario.role?.name ?? null,
    };
  }
}
