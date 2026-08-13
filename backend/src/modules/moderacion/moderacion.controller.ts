import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/auth.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { RolUsuario } from '../../common/enums/dominio.enum';
import type { UsuarioJwt } from '../auth/interfaces/usuario-jwt.interface';
import {
  AsignarReporteDto,
  DescartarReporteDto,
  UuidParamDto,
  ValidarReporteDto,
} from './dto/moderacion.dto';
import { ModeracionService } from './moderacion.service';

@Controller('moderacion')
@Roles(RolUsuario.MODERADOR, RolUsuario.ADMIN)
export class ModeracionController {
  constructor(private readonly moderacionService: ModeracionService) {}

  @Get('cola')
  cola() {
    return this.moderacionService.cola();
  }

  @Get('ingenieros')
  ingenieros() {
    return this.moderacionService.listarIngenieros();
  }

  @Post(':uuid/validar')
  validar(@Param() params: UuidParamDto, @Body() dto: ValidarReporteDto) {
    return this.moderacionService.validar(params.uuid, dto);
  }

  @Post(':uuid/descartar')
  descartar(@Param() params: UuidParamDto, @Body() dto: DescartarReporteDto) {
    return this.moderacionService.descartar(params.uuid, dto);
  }

  @Post(':uuid/asignar')
  asignar(
    @Param() params: UuidParamDto,
    @Body() dto: AsignarReporteDto,
    @UsuarioActual() usuario: UsuarioJwt,
  ) {
    return this.moderacionService.asignar(params.uuid, dto, usuario.sub);
  }

  @Delete(':uuid')
  eliminar(@Param() params: UuidParamDto) {
    return this.moderacionService.eliminar(params.uuid);
  }
}
