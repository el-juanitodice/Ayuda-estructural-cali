import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/auth.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { ModuleAccess } from '../permissions/decorators/module-access.decorator';
import { AuthService } from './auth.service';
import { DefinirClaveDto, LoginDto, RecuperarClaveDto, ReautenticarDto } from './dto/auth.dto';
import type { UsuarioJwt } from './interfaces/usuario-jwt.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post('definir-clave')
  definirClave(@Body() dto: DefinirClaveDto) {
    return this.authService.definirClave(dto);
  }

  @Public()
  @Post('recuperar')
  recuperar(@Body() dto: RecuperarClaveDto) {
    return this.authService.recuperar(dto);
  }

  @Get('yo')
  yo(@UsuarioActual() usuario: UsuarioJwt) {
    return this.authService.yo(usuario.sub);
  }

  @ModuleAccess('revision', 'u')
  @Throttle({ default: { limit: 20, ttl: 900_000 } })
  @Post('reautenticar')
  @HttpCode(HttpStatus.OK)
  reautenticar(@UsuarioActual() usuario: UsuarioJwt, @Body() dto: ReautenticarDto) {
    return this.authService.reautenticar(usuario.sub, dto);
  }
}
