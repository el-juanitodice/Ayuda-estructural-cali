import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/auth.decorator';
import { RolUsuario } from '../../common/enums/dominio.enum';
import { AdminService } from './admin.service';
import { CrearUsuarioDto } from './dto/admin.dto';

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
}
