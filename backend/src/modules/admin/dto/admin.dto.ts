import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearUsuarioDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombre!: string;

  @IsUUID()
  role_id!: string;

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

export class ActualizarUsuarioDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsUUID()
  role_id?: string;

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

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
