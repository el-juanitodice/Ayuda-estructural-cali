import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BanderasEmergenciaDto {
  @IsOptional()
  @IsBoolean()
  personasAtrapadas?: boolean;

  @IsOptional()
  @IsBoolean()
  colapsoEnCurso?: boolean;
}

export class CrearReporteDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  reportante_nombre!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(20)
  reportante_telefono!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  reportante_relacion?: string | null;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  direccion!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  barrio?: string | null;

  @IsNumber()
  @Min(2.9)
  @Max(4.0)
  lat!: number;

  @IsNumber()
  @Min(-77.2)
  @Max(-76.0)
  lng!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  precision_gps_m?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tipo_edificacion?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  pisos_declarados?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  unidades_declaradas?: number | null;

  @IsOptional()
  @IsBoolean()
  habitada?: boolean | null;

  @IsOptional()
  @IsInt()
  uso_declarado?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  descripcion?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => BanderasEmergenciaDto)
  banderas?: BanderasEmergenciaDto;
}
