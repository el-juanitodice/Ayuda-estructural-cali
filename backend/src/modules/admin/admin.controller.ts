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
import { Roles } from '../../common/decorators/auth.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { RolUsuario } from '../../common/enums/dominio.enum';
import type { UsuarioJwt } from '../auth/interfaces/usuario-jwt.interface';
import { AdminService } from './admin.service';
import { ActualizarUsuarioDto, CrearUsuarioDto } from './dto/admin.dto';

@Controller('admin')
@Roles(RolUsuario.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('usuarios')
  listarUsuarios() {
    return this.adminService.listarUsuarios();
  }

  @Post('usuarios')
  crearUsuario(@Body() dto: CrearUsuarioDto) {
    return this.adminService.crearUsuario(dto);
  }

  @Patch('usuarios/:id')
  actualizarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.adminService.actualizarUsuario(id, dto, actor.sub);
  }

  @Delete('usuarios/:id')
  desactivarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioJwt,
  ) {
    return this.adminService.desactivarUsuario(id, actor.sub);
  }

  @Post('usuarios/:id/reenviar-enlace')
  reenviarEnlaceAlta(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.reenviarEnlaceAlta(id);
  }
}
