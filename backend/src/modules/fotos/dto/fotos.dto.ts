import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

const CATEGORIAS = [
  'fachada_principal',
  'entorno_vecinos',
  'suelo_alrededor',
  'columnas_muros',
  'vigas',
  'nudos_conexiones',
  'entrepisos_cielos',
  'muros_fachada',
  'escaleras',
  'cubierta',
  'tanques_instalaciones',
  'grietas_detalle',
  'otras',
] as const;

export class SubirFotoDto {
  @IsUUID()
  reporte_uuid!: string;

  @IsUUID()
  uuid!: string;

  @IsString()
  @IsIn(CATEGORIAS)
  categoria!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  piso?: string;

  @IsOptional()
  @IsString()
  @IsIn(['webp', 'jpeg'])
  formato?: 'webp' | 'jpeg';

  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(10_000)
  ancho?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(10_000)
  alto?: number;

  /**
   * JSON string en multipart, ej: {"lat":3.44,"lng":-76.52,"tomada_en":"2026-08-12T10:00:00Z"}
   */
  @IsOptional()
  @IsString()
  exif?: string;
}

export class ListarFotosReporteParamsDto {
  @IsUUID()
  reporteUuid!: string;
}

export class ObtenerFotoParamsDto {
  @IsUUID()
  uuid!: string;
}

export class ObtenerFotoQueryDto {
  @IsOptional()
  @IsIn(['thumb', 'full'])
  tam?: 'thumb' | 'full';
}
