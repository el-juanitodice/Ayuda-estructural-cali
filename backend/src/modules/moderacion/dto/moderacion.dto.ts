import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UuidParamDto {
  @IsUUID()
  uuid!: string;
}

export class CorreccionesValidarDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  barrio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  comuna?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  pisos_declarados?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  unidades_declaradas?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(11)
  uso_declarado?: number;

  @IsOptional()
  @IsBoolean()
  habitada?: boolean;

  @IsOptional()
  @IsBoolean()
  menciona_colapso?: boolean;

  @IsOptional()
  @IsBoolean()
  menciona_inclinacion?: boolean;

  @IsOptional()
  @IsBoolean()
  menciona_geotecnico?: boolean;
}

export class ValidarReporteDto {
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  notas_llamada!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CorreccionesValidarDto)
  correcciones?: CorreccionesValidarDto;
}

export enum MotivoDescarte {
  DUPLICADO = 'duplicado',
  NO_CONTESTA = 'no_contesta',
  FUERA_DE_ZONA = 'fuera_de_zona',
  SPAM = 'spam',
  OTRO = 'otro',
}

export class DescartarReporteDto {
  @IsEnum(MotivoDescarte)
  motivo!: MotivoDescarte;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string | null;
}

export class AsignarReporteDto {
  @IsInt()
  @Min(1)
  ingeniero_id!: number;
}

export class IngenieroIdParamDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  id!: number;
}
