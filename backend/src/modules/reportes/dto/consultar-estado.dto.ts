import { Matches } from 'class-validator';

export class ConsultarEstadoParamsDto {
  @Matches(/^CAL-\d{4}-\d{5}$/i)
  consecutivo!: string;
}
