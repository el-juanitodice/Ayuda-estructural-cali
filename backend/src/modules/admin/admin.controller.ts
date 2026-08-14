import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { ModuleAccess } from '../permissions/decorators/module-access.decorator';
import type { UsuarioJwt } from '../auth/interfaces/usuario-jwt.interface';
import { AdminService } from './admin.service';
import { ActualizarUsuarioDto, CrearUsuarioDto } from './dto/admin.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('roles')
  @ModuleAccess('admin_usuarios', 'r')
  listarRoles() {
    return this.adminService.listarRoles();
  }

  @Get('usuarios')
  @ModuleAccess('admin_usuarios', 'r')
  listarUsuarios() {
    return this.adminService.listarUsuarios();
  }

  @Post('usuarios')
  @ModuleAccess('admin_usuarios', 'w')
  crearUsuario(@Body() dto: CrearUsuarioDto) {
    return this.adminService.crearUsuario(dto);
  }

  @Patch('usuarios/:id')
  @ModuleAccess('admin_usuarios', 'u')
  actualizarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.adminService.actualizarUsuario(id, dto, actor.sub);
  }

  @Delete('usuarios/:id')
  @ModuleAccess('admin_usuarios', 'd')
  desactivarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.adminService.desactivarUsuario(id, actor.sub);
  }

  @Post('usuarios/:id/reenviar-enlace')
  @ModuleAccess('admin_usuarios', 'u')
  reenviarEnlaceAlta(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.reenviarEnlaceAlta(id);
  }
}
