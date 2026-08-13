import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/auth.decorator';
import { RolUsuario } from '../../common/enums/dominio.enum';
import { ExportarTableroQueryDto } from './dto/tablero.dto';
import { TableroService } from './tablero.service';

@Controller('tablero')
@Roles(RolUsuario.COORDINADOR, RolUsuario.ADMIN)
export class TableroController {
  constructor(private readonly tableroService: TableroService) {}

  @Get('cobertura')
  cobertura() {
    return this.tableroService.cobertura();
  }

  @Get('discrepancias')
  discrepancias() {
    return this.tableroService.discrepancias();
  }

  @Get('vencimientos')
  vencimientos() {
    return this.tableroService.vencimientos();
  }

  @Get('exportar')
  async exportar(@Query() query: ExportarTableroQueryDto, @Res() res: Response) {
    const desde = query.desde ?? '2026-01-01';
    const hasta = query.hasta ?? '2100-01-01';
    const csv = await this.tableroService.exportarCsv(desde, hasta);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="inspecciones_${desde}_${hasta}.csv"`);
    res.send(csv);
  }
}
