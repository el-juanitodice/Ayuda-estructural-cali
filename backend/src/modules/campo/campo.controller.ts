import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { ModuleAccess } from '../permissions/decorators/module-access.decorator';
import type { UsuarioJwt } from '../auth/interfaces/usuario-jwt.interface';
import { CampoService } from './campo.service';
import { FirmarFormularioDto, GuardarFormularioDto, UuidParamDto } from './dto/campo.dto';

@Controller('campo')
export class CampoController {
  constructor(private readonly campoService: CampoService) {}

  @Get('mis-asignaciones')
  @ModuleAccess('campo', 'r')
  misAsignaciones(@UsuarioActual() usuario: UsuarioJwt) {
    return this.campoService.misAsignaciones(usuario.sub);
  }

  @Post('formularios')
  @ModuleAccess('campo', 'w')
  guardarFormulario(@Body() dto: GuardarFormularioDto, @UsuarioActual() usuario: UsuarioJwt) {
    return this.campoService.guardarFormulario(dto, usuario.sub);
  }

  @Get('revision')
  @ModuleAccess('revision', 'r')
  colaRevision(@UsuarioActual() usuario: UsuarioJwt) {
    return this.campoService.colaRevision(usuario.sub);
  }

  @Get('formularios/:uuid')
  obtenerFormulario(@Param() params: UuidParamDto, @UsuarioActual() usuario: UsuarioJwt) {
    return this.campoService.obtenerFormulario(params.uuid, usuario);
  }

  @Post('formularios/:uuid/firmar')
  @ModuleAccess('revision', 'u')
  firmar(
    @Param() params: UuidParamDto,
    @Body() dto: FirmarFormularioDto,
    @UsuarioActual() usuario: UsuarioJwt,
  ) {
    return this.campoService.firmar(params.uuid, dto, usuario.sub);
  }
}
