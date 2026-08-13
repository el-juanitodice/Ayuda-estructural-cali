import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HabitabilidadColor, NivelRiesgo } from '../../../common/enums/dominio.enum';
import { EstadoFormulario } from '../../../database/entities/formulario-ais.entity';

export class UuidParamDto {
  @IsUUID()
  uuid!: string;
}

export class DanoDto {
  @IsString()
  grupo!: string;

  @IsString()
  elemento!: string;

  @IsInt()
  pct_ninguno!: number;

  @IsInt()
  pct_leve!: number;

  @IsInt()
  pct_moderado!: number;

  @IsInt()
  pct_fuerte!: number;

  @IsInt()
  pct_severo!: number;
}

export class GuardarFormularioDto {
  @IsUUID()
  uuid!: string;

  @IsUUID()
  reporte_uuid!: string;

  @IsEnum(EstadoFormulario)
  estado!: EstadoFormulario.BORRADOR | EstadoFormulario.CAPTURADO;

  @IsOptional()
  @IsBoolean()
  visita_presencial_b?: boolean | null;

  @IsOptional()
  @IsInt()
  sistema_estructural?: number | null;

  @IsOptional()
  @IsString()
  colapso?: string | null;

  @IsOptional()
  @IsString()
  inclinacion?: string | null;

  @IsOptional()
  @IsString()
  asentamiento?: string | null;

  @IsOptional()
  @IsString()
  falla_talud?: string | null;

  @IsOptional()
  @IsInt()
  pisos_sobre_terreno?: number | null;

  @IsOptional()
  @IsInt()
  anio_construccion?: number | null;

  @IsOptional()
  @IsString()
  piso_mayor_dano?: string | null;

  @IsOptional()
  @IsString()
  porcentaje_dano?: string | null;

  @IsOptional()
  @IsString()
  comentarios?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DanoDto)
  danos?: DanoDto[];
}

export class RiesgosDto {
  @IsEnum(NivelRiesgo)
  estabilidad!: NivelRiesgo;

  @IsEnum(NivelRiesgo)
  geotecnico!: NivelRiesgo;

  @IsEnum(NivelRiesgo)
  estructural!: NivelRiesgo;

  @IsEnum(NivelRiesgo)
  no_estructural!: NivelRiesgo;
}

export class FirmarFormularioDto {
  @IsString()
  @MinLength(20)
  ticket_firma!: string;

  @ValidateNested()
  @Type(() => RiesgosDto)
  riesgos!: RiesgosDto;

  @IsEnum(HabitabilidadColor)
  habitabilidad_final!: HabitabilidadColor;

  @IsOptional()
  @IsString()
  @Length(5, 2000)
  motivo_discrepancia?: string | null;

  @IsBoolean()
  visita_presencial!: boolean;
}
