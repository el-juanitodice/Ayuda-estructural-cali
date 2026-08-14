import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PropositoToken } from '../../common/enums/dominio.enum';
import { Role } from '../../database/entities/role.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuthService } from '../auth/auth.service';
import { CorreoService } from '../correo/correo.service';
import { PermissionsService } from '../permissions/permissions.service';
import type { ActualizarUsuarioDto, CrearUsuarioDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly correo: CorreoService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async listarRoles() {
    const roles = await this.rolesRepo.find({ order: { name: 'ASC' } });
    const enriched = await Promise.all(
      roles.map(async (role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        requires_engineering_credentials:
          await this.permissionsService.roleRequiresEngineeringCredentials(role.id),
      })),
    );
    return { roles: enriched };
  }

  async listarUsuarios() {
    const usuarios = await this.usuariosRepo.find({
      order: { creadoEn: 'DESC' },
      relations: { role: true },
    });

    return {
      usuarios: usuarios.map((u) => this.serializarUsuario(u)),
    };
  }

  async crearUsuario(dto: CrearUsuarioDto) {
    const roleId = await this.resolverRoleId(dto.role_id);
    const requiereIngenieria =
      await this.permissionsService.roleRequiresEngineeringCredentials(roleId);

    if (requiereIngenieria && !(dto.matricula && dto.profesion)) {
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
      roleId,
      telefono: dto.telefono ?? null,
      matricula: requiereIngenieria ? dto.matricula! : null,
      profesion: requiereIngenieria ? dto.profesion! : null,
      matriculaVerificadaEn: requiereIngenieria ? new Date() : null,
      activo: true,
    });

    await this.usuariosRepo.save(usuario);

    const token = await this.authService.emitirEnlaceClave(usuario, PropositoToken.ALTA_CLAVE);

    const esDev = this.config.get<string>('app.entorno', 'development') !== 'production';

    return {
      usuario: this.serializarUsuario(usuario),
      mensaje: 'Cuenta creada. Se envió el enlace de alta al correo.',
      ...(esDev ? { enlace_alta: this.correo.construirEnlace(token, PropositoToken.ALTA_CLAVE) } : {}),
    };
  }

  async actualizarUsuario(id: number, dto: ActualizarUsuarioDto, actorUuid: string) {
    const usuario = await this.buscarPorId(id);
    const roleIdFinal = dto.role_id ?? usuario.roleId;
    const activoFinal = dto.activo ?? usuario.activo;

    if (usuario.activo && !activoFinal) {
      await this.assertPuedeDesactivar(usuario, actorUuid);
    }

    const teniaAdmin = await this.permissionsService.roleHasPermission(
      usuario.roleId,
      'admin_usuarios',
      'w',
    );
    const tendraAdmin = await this.permissionsService.roleHasPermission(
      roleIdFinal,
      'admin_usuarios',
      'w',
    );

    if (usuario.activo && teniaAdmin && !tendraAdmin && activoFinal) {
      await this.assertNoEsUltimoAdmin();
    }

    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase();
      if (email !== usuario.email) {
        const existente = await this.usuariosRepo.findOne({ where: { email } });
        if (existente) {
          throw new ConflictException({
            error: 'email_en_uso',
            mensaje: 'Ya existe una cuenta con ese correo.',
          });
        }
        usuario.email = email;
      }
    }

    if (dto.nombre !== undefined) usuario.nombre = dto.nombre;
    if (dto.telefono !== undefined) usuario.telefono = dto.telefono ?? null;
    if (dto.activo !== undefined) usuario.activo = dto.activo;

    if (dto.role_id !== undefined) {
      usuario.roleId = await this.resolverRoleId(dto.role_id);
    }

    await this.aplicarDatosIngeniero(usuario, dto);

    await this.usuariosRepo.save(usuario);

    const actualizado = await this.buscarPorId(id);
    return {
      usuario: this.serializarUsuario(actualizado),
      mensaje: 'Usuario actualizado.',
    };
  }

  async desactivarUsuario(id: number, actorUuid: string) {
    const usuario = await this.buscarPorId(id);
    await this.assertPuedeDesactivar(usuario, actorUuid);

    usuario.activo = false;
    await this.usuariosRepo.save(usuario);

    return { ok: true, mensaje: 'Cuenta desactivada.' };
  }

  async reenviarEnlaceAlta(id: number) {
    const usuario = await this.buscarPorId(id);

    if (!usuario.activo) {
      throw new UnprocessableEntityException({
        error: 'cuenta_inactiva',
        mensaje: 'No se puede reenviar el enlace a una cuenta inactiva.',
      });
    }

    if (usuario.claveDefinidaEn) {
      throw new UnprocessableEntityException({
        error: 'clave_ya_definida',
        mensaje: 'Esta cuenta ya tiene contraseña. Usa recuperación de contraseña.',
      });
    }

    const token = await this.authService.emitirEnlaceClave(usuario, PropositoToken.ALTA_CLAVE);
    const esDev = this.config.get<string>('app.entorno', 'development') !== 'production';

    return {
      ok: true,
      mensaje: 'Enlace de alta reenviado al correo.',
      ...(esDev ? { enlace_alta: this.correo.construirEnlace(token, PropositoToken.ALTA_CLAVE) } : {}),
    };
  }

  private async resolverRoleId(roleId: string): Promise<string> {
    const role = await this.rolesRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException({
        error: 'rol_no_encontrado',
        mensaje: 'El rol indicado no existe.',
      });
    }
    return role.id;
  }

  private async buscarPorId(id: number) {
    const usuario = await this.usuariosRepo.findOne({
      where: { id: String(id) },
      relations: { role: true },
    });
    if (!usuario) {
      throw new NotFoundException({
        error: 'usuario_no_encontrado',
        mensaje: 'Usuario no encontrado.',
      });
    }
    return usuario;
  }

  private async assertPuedeDesactivar(usuario: Usuario, actorUuid: string) {
    if (usuario.uuid === actorUuid) {
      throw new UnprocessableEntityException({
        error: 'auto_desactivacion',
        mensaje: 'No puedes desactivarte a ti mismo.',
      });
    }

    const esAdmin = await this.permissionsService.roleHasPermission(
      usuario.roleId,
      'admin_usuarios',
      'w',
    );
    if (esAdmin && usuario.activo) {
      await this.assertNoEsUltimoAdmin();
    }
  }

  private async assertNoEsUltimoAdmin() {
    const adminsActivos = await this.permissionsService.countActiveUsersWithPermission(
      'admin_usuarios',
      'w',
    );
    if (adminsActivos <= 1) {
      throw new UnprocessableEntityException({
        error: 'ultimo_admin',
        mensaje: 'Debe existir al menos un administrador activo.',
      });
    }
  }

  private async aplicarDatosIngeniero(usuario: Usuario, dto: ActualizarUsuarioDto) {
    const requiereIngenieria = await this.permissionsService.roleRequiresEngineeringCredentials(
      usuario.roleId,
    );

    if (!requiereIngenieria) {
      usuario.matricula = null;
      usuario.profesion = null;
      usuario.matriculaVerificadaEn = null;
      return;
    }

    const matricula = dto.matricula !== undefined ? dto.matricula : usuario.matricula;
    const profesion = dto.profesion !== undefined ? dto.profesion : usuario.profesion;

    if (!(matricula && profesion)) {
      throw new UnprocessableEntityException({
        error: 'matricula_requerida',
        mensaje:
          'Un ingeniero requiere matrícula COPNIA verificada y profesión. Verifícala en copnia.gov.co antes de guardar.',
      });
    }

    const cambioIngeniero =
      dto.matricula !== undefined || dto.profesion !== undefined || dto.role_id !== undefined;

    usuario.matricula = matricula;
    usuario.profesion = profesion;
    if (cambioIngeniero) {
      usuario.matriculaVerificadaEn = new Date();
    }
  }

  private serializarUsuario(u: Usuario) {
    return {
      id: Number(u.id),
      uuid: u.uuid,
      email: u.email,
      nombre: u.nombre,
      role_id: u.roleId,
      role_name: u.role?.name ?? null,
      telefono: u.telefono,
      activo: u.activo,
      matricula: u.matricula,
      profesion: u.profesion,
      clave_definida: !!u.claveDefinidaEn,
      ultimo_acceso: u.ultimoAcceso,
    };
  }
}
