import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/auth.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { RolUsuario } from '../../common/enums/dominio.enum';
import type { UsuarioJwt } from '../auth/interfaces/usuario-jwt.interface';
import { CampoService } from './campo.service';
import { FirmarFormularioDto, GuardarFormularioDto, UuidParamDto } from './dto/campo.dto';

@Controller('campo')
export class CampoController {
  constructor(private readonly campoService: CampoService) {}

  @Get('mis-asignaciones')
  @Roles(RolUsuario.INGENIERO_A, RolUsuario.INGENIERO_B)
  misAsignaciones(@UsuarioActual() usuario: UsuarioJwt) {
    return this.campoService.misAsignaciones(usuario.sub);
  }

  @Post('formularios')
  @Roles(RolUsuario.INGENIERO_A, RolUsuario.INGENIERO_B)
  guardarFormulario(@Body() dto: GuardarFormularioDto, @UsuarioActual() usuario: UsuarioJwt) {
    return this.campoService.guardarFormulario(dto, usuario.sub);
  }

  @Get('revision')
  @Roles(RolUsuario.INGENIERO_A)
  colaRevision(@UsuarioActual() usuario: UsuarioJwt) {
    return this.campoService.colaRevision(usuario.sub);
  }

  @Get('formularios/:uuid')
  @Roles(RolUsuario.INGENIERO_A, RolUsuario.INGENIERO_B)
  obtenerFormulario(@Param() params: UuidParamDto, @UsuarioActual() usuario: UsuarioJwt) {
    return this.campoService.obtenerFormulario(params.uuid, usuario.sub, usuario.rol);
  }

  @Post('formularios/:uuid/firmar')
  @Roles(RolUsuario.INGENIERO_A)
  firmar(
    @Param() params: UuidParamDto,
    @Body() dto: FirmarFormularioDto,
    @UsuarioActual() usuario: UsuarioJwt,
  ) {
    return this.campoService.firmar(params.uuid, dto, usuario.sub);
  }
}
