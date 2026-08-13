import { createHash, randomBytes } from 'node:crypto';
import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { PropositoToken } from '../../common/enums/dominio.enum';
import { TokenAcceso } from '../../database/entities/token-acceso.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import type { DefinirClaveDto, LoginDto, RecuperarClaveDto, ReautenticarDto } from './dto/auth.dto';
import type { JwtPayload } from './interfaces/usuario-jwt.interface';
import { TicketFirmaService } from './ticket-firma.service';
import { CorreoService } from '../correo/correo.service';

const OPCIONES_ARGON = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    @InjectRepository(TokenAcceso)
    private readonly tokensRepo: Repository<TokenAcceso>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly ticketFirma: TicketFirmaService,
    private readonly correo: CorreoService,
  ) {}

  async login({ email, clave }: LoginDto) {
    const usuario = await this.usuariosRepo.findOne({
      where: { email: email.toLowerCase() },
    });

    const generico = () =>
      new UnauthorizedException({
        error: 'credenciales_invalidas',
        mensaje: 'Correo o contraseña incorrectos.',
      });

    if (!usuario?.activo || !usuario.hashClave) throw generico();

    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      throw new UnauthorizedException({
        error: 'cuenta_bloqueada',
        mensaje: 'Cuenta bloqueada temporalmente por intentos fallidos.',
      });
    }

    const valida = await argon2.verify(usuario.hashClave, clave).catch(() => false);
    if (!valida) {
      await this.registrarIntentoFallido(usuario);
      throw generico();
    }

    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = null;
    usuario.ultimoAcceso = new Date();
    await this.usuariosRepo.save(usuario);

    return this.emitirToken(usuario);
  }

  async definirClave({ token, clave }: DefinirClaveDto) {
    const tokenHash = this.sha256(token);
    const registro = await this.tokensRepo.findOne({
      where: {
        tokenHash,
        usadoEn: IsNull(),
        expiraEn: MoreThan(new Date()),
      },
      relations: { usuario: true },
    });

    if (!registro?.usuario.activo) {
      throw new UnprocessableEntityException({
        error: 'token_invalido',
        mensaje: 'El enlace no es válido o ya expiró. Pide uno nuevo.',
      });
    }

    const hash = await argon2.hash(clave, OPCIONES_ARGON);
    registro.usadoEn = new Date();
    registro.usuario.hashClave = hash;
    registro.usuario.claveDefinidaEn = new Date();
    registro.usuario.intentosFallidos = 0;
    registro.usuario.bloqueadoHasta = null;

    await this.tokensRepo.save(registro);
    await this.usuariosRepo.save(registro.usuario);

    return { ok: true };
  }

  async recuperar({ email }: RecuperarClaveDto) {
    const usuario = await this.usuariosRepo.findOne({
      where: { email: email.toLowerCase(), activo: true },
    });

    if (usuario) {
      await this.emitirEnlaceClave(usuario, PropositoToken.RECUPERAR_CLAVE);
    }

    return {
      mensaje: 'Si el correo existe, te llegará un enlace de recuperación.',
    };
  }

  perfil(usuario: Usuario) {
    return {
      usuario: {
        id: usuario.uuid,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        matricula: usuario.matricula,
      },
    };
  }

  async yo(uuid: string) {
    const usuario = await this.usuariosRepo.findOne({ where: { uuid, activo: true } });
    if (!usuario) {
      throw new UnauthorizedException({
        error: 'no_autorizado',
        mensaje: 'Sesión inválida.',
      });
    }
    return this.perfil(usuario);
  }

  async reautenticar(uuid: string, { clave }: ReautenticarDto) {
    const usuario = await this.usuariosRepo.findOne({ where: { uuid, activo: true } });
    if (!usuario?.hashClave) {
      throw new UnauthorizedException({
        error: 'credenciales',
        mensaje: 'Contraseña incorrecta. La firma exige confirmar tu identidad.',
      });
    }

    const valida = await argon2.verify(usuario.hashClave, clave).catch(() => false);
    if (!valida) {
      throw new UnauthorizedException({
        error: 'credenciales',
        mensaje: 'Contraseña incorrecta. La firma exige confirmar tu identidad.',
      });
    }

    return this.ticketFirma.emitir(usuario.uuid);
  }

  async emitirEnlaceClave(usuario: Usuario, proposito: PropositoToken): Promise<string> {
    const token = await this.crearTokenAcceso(usuario, proposito);
    await this.correo.enviarEnlaceClave({
      email: usuario.email,
      nombre: usuario.nombre,
      token,
      proposito,
    });
    return token;
  }

  async crearTokenAcceso(usuario: Usuario, proposito: PropositoToken) {
    const token = randomBytes(32).toString('base64url');
    const expira = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.tokensRepo.save(
      this.tokensRepo.create({
        usuarioId: usuario.id,
        tokenHash: this.sha256(token),
        proposito,
        expiraEn: expira,
      }),
    );

    return token;
  }

  private emitirToken(usuario: Usuario) {
    const payload: JwtPayload = {
      sub: usuario.uuid,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
    };

    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      usuario: {
        id: usuario.uuid,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        matricula: usuario.matricula,
      },
    };
  }

  private async registrarIntentoFallido(usuario: Usuario) {
    const max = this.config.get<number>('auth.maxIntentosLogin', 5);
    const bloqueoMin = this.config.get<number>('auth.bloqueoMinutos', 15);
    usuario.intentosFallidos += 1;

    if (usuario.intentosFallidos >= max) {
      usuario.bloqueadoHasta = new Date(Date.now() + bloqueoMin * 60_000);
      usuario.intentosFallidos = 0;
    }

    await this.usuariosRepo.save(usuario);
  }

  private sha256(valor: string): string {
    return createHash('sha256').update(valor).digest('hex');
  }
}
