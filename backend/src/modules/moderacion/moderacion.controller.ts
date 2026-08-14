import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { ModuleAccess } from '../permissions/decorators/module-access.decorator';
import type { UsuarioJwt } from '../auth/interfaces/usuario-jwt.interface';
import {
  AsignarReporteDto,
  DescartarReporteDto,
  UuidParamDto,
  ValidarReporteDto,
} from './dto/moderacion.dto';
import { ModeracionService } from './moderacion.service';

@Controller('moderacion')
export class ModeracionController {
  constructor(private readonly moderacionService: ModeracionService) {}

  @Get('cola')
  @ModuleAccess('moderacion', 'r')
  cola() {
    return this.moderacionService.cola();
  }

  @Get('ingenieros')
  @ModuleAccess('moderacion', 'r')
  ingenieros() {
    return this.moderacionService.listarIngenieros();
  }

  @Post(':uuid/validar')
  @ModuleAccess('moderacion', 'u')
  validar(@Param() params: UuidParamDto, @Body() dto: ValidarReporteDto) {
    return this.moderacionService.validar(params.uuid, dto);
  }

  @Post(':uuid/descartar')
  @ModuleAccess('moderacion', 'u')
  descartar(@Param() params: UuidParamDto, @Body() dto: DescartarReporteDto) {
    return this.moderacionService.descartar(params.uuid, dto);
  }

  @Post(':uuid/asignar')
  @ModuleAccess('moderacion', 'u')
  asignar(
    @Param() params: UuidParamDto,
    @Body() dto: AsignarReporteDto,
    @UsuarioActual() usuario: UsuarioJwt,
  ) {
    return this.moderacionService.asignar(params.uuid, dto, usuario.sub);
  }

  @Delete(':uuid')
  @ModuleAccess('moderacion', 'd')
  eliminar(@Param() params: UuidParamDto) {
    return this.moderacionService.eliminar(params.uuid);
  }
}
