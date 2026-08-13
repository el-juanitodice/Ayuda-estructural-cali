import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/auth.decorator';
import {
  THROTTLE_REPORTES_CREAR,
  THROTTLE_REPORTES_ESTADO,
} from '../../config/throttle-limits';
import { CrearReporteDto } from './dto/crear-reporte.dto';
import { ConsultarEstadoParamsDto } from './dto/consultar-estado.dto';
import { ReportesService } from './reportes.service';

const sinLimiteReportes = THROTTLE_REPORTES_CREAR.limit === 0;

@Controller()
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Public()
  @SkipThrottle({ default: sinLimiteReportes })
  @Throttle({ default: THROTTLE_REPORTES_CREAR })
  @Post('reportes')
  crear(@Body() dto: CrearReporteDto) {
    return this.reportesService.crear(dto);
  }

  @Public()
  @Get('mapa')
  mapa() {
    return this.reportesService.mapaPublico();
  }

  @Public()
  @Throttle({ default: THROTTLE_REPORTES_ESTADO })
  @Get('reportes/:consecutivo/estado')
  estado(@Param() params: ConsultarEstadoParamsDto) {
    return this.reportesService.consultarEstado(params.consecutivo);
  }
}
