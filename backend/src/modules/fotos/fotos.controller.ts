import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../../common/decorators/auth.decorator';
import { UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { ModuleAccess } from '../permissions/decorators/module-access.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import type { UsuarioJwt } from '../auth/interfaces/usuario-jwt.interface';
import {
  ListarFotosReporteParamsDto,
  ObtenerFotoParamsDto,
  ObtenerFotoQueryDto,
  SubirFotoDto,
} from './dto/fotos.dto';
import { FotosService } from './fotos.service';

@Controller('fotos')
export class FotosController {
  constructor(private readonly fotosService: FotosService) {}

  /**
   * Sube full + thumb en una sola petición multipart.
   * Sin JWT: reportante ciudadano. Con JWT: exige permiso fotos (w).
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 200, ttl: 3_600_000 } })
  @Post('subir')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'full', maxCount: 1 },
        { name: 'thumb', maxCount: 1 },
      ],
      { limits: { fileSize: 4 * 1024 * 1024 } },
    ),
  )
  subir(
    @UploadedFiles()
    archivos: { full?: Express.Multer.File[]; thumb?: Express.Multer.File[] },
    @Body() dto: SubirFotoDto,
    @UsuarioActual() usuario?: UsuarioJwt,
  ) {
    const full = archivos.full?.[0];
    const thumb = archivos.thumb?.[0];
    if (!full || !thumb) {
      throw new BadRequestException({
        error: 'archivos_requeridos',
        mensaje: 'Debes enviar los campos multipart "full" y "thumb".',
      });
    }
    return this.fotosService.subir(dto, { full, thumb }, usuario);
  }

  /** Lista fotos de un reporte (filtradas por rol) */
  @Get('reporte/:reporteUuid')
  @ModuleAccess('fotos', 'r')
  listarPorReporte(
    @Param() params: ListarFotosReporteParamsDto,
    @UsuarioActual() usuario: UsuarioJwt,
  ) {
    return this.fotosService.listarPorReporte(params.reporteUuid, usuario);
  }

  /** Sirve la imagen desde el almacenamiento local (autenticado) */
  @Get(':uuid')
  @ModuleAccess('fotos', 'r')
  async ver(
    @Param() params: ObtenerFotoParamsDto,
    @Query() query: ObtenerFotoQueryDto,
    @UsuarioActual() usuario: UsuarioJwt,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.fotosService.obtenerArchivo(
      params.uuid,
      query.tam ?? 'thumb',
      usuario,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  }
}
