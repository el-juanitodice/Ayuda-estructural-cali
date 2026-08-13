import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RolUsuario } from '../../../common/enums/dominio.enum';

export class CrearUsuarioDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombre!: string;

  @IsEnum(RolUsuario)
  rol!: RolUsuario;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  matricula?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  profesion?: string | null;
}
