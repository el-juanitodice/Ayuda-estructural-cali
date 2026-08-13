import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PropositoToken, RolUsuario } from '../../common/enums/dominio.enum';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuthService } from '../auth/auth.service';
import { CorreoService } from '../correo/correo.service';
import type { CrearUsuarioDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly correo: CorreoService,
  ) {}

  async listarUsuarios() {
    const usuarios = await this.usuariosRepo.find({
      order: { creadoEn: 'DESC' },
    });

    return {
      usuarios: usuarios.map((u) => ({
        id: Number(u.id),
        uuid: u.uuid,
        email: u.email,
        nombre: u.nombre,
        rol: u.rol,
        telefono: u.telefono,
        activo: u.activo,
        matricula: u.matricula,
        clave_definida: !!u.claveDefinidaEn,
        ultimo_acceso: u.ultimoAcceso,
      })),
    };
  }

  async crearUsuario(dto: CrearUsuarioDto) {
    const esIngeniero = [RolUsuario.INGENIERO_A, RolUsuario.INGENIERO_B].includes(dto.rol);

    if (esIngeniero && !(dto.matricula && dto.profesion)) {
      throw new UnprocessableEntityException({
        error: 'matricula_requerida',
        mensaje:
          'Un ingeniero requiere matrícula COPNIA verificada y profesión. Verifícala en copnia.gov.co antes de crear la cuenta.',
      });
    }

    const email = dto.email.toLowerCase();
    const existente = await this.usuariosRepo.findOne({ where: { email } });
    if (existente) {
      throw new ConflictException({
        error: 'email_en_uso',
        mensaje: 'Ya existe una cuenta con ese correo.',
      });
    }

    const usuario = this.usuariosRepo.create({
      uuid: uuidv4(),
      email,
      nombre: dto.nombre,
      rol: dto.rol,
      telefono: dto.telefono ?? null,
      matricula: esIngeniero ? dto.matricula! : null,
      profesion: esIngeniero ? dto.profesion! : null,
      matriculaVerificadaEn: esIngeniero ? new Date() : null,
      activo: true,
    });

    await this.usuariosRepo.save(usuario);

    const token = await this.authService.emitirEnlaceClave(usuario, PropositoToken.ALTA_CLAVE);

    const esDev = this.config.get<string>('app.entorno', 'development') !== 'production';

    return {
      usuario: {
        id: Number(usuario.id),
        uuid: usuario.uuid,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
      mensaje: 'Cuenta creada. Se envió el enlace de alta al correo.',
      ...(esDev ? { enlace_alta: this.correo.construirEnlace(token, PropositoToken.ALTA_CLAVE) } : {}),
    };
  }
}
