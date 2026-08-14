import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ModuleAccess } from '../permissions/decorators/module-access.decorator';
import { ExportarTableroQueryDto } from './dto/tablero.dto';
import { TableroService } from './tablero.service';

@Controller('tablero')
export class TableroController {
  constructor(private readonly tableroService: TableroService) {}

  @Get('cobertura')
  @ModuleAccess('tablero', 'r')
  cobertura() {
    return this.tableroService.cobertura();
  }

  @Get('discrepancias')
  @ModuleAccess('tablero', 'r')
  discrepancias() {
    return this.tableroService.discrepancias();
  }

  @Get('vencimientos')
  @ModuleAccess('tablero', 'r')
  vencimientos() {
    return this.tableroService.vencimientos();
  }

  @Get('exportar')
  @ModuleAccess('tablero', 'r')
  async exportar(@Query() query: ExportarTableroQueryDto, @Res() res: Response) {
    const desde = query.desde ?? '2026-01-01';
    const hasta = query.hasta ?? '2100-01-01';
    const csv = await this.tableroService.exportarCsv(desde, hasta);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="inspecciones_${desde}_${hasta}.csv"`);
    res.send(csv);
  }
}
