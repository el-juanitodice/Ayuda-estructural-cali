import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  clave!: string;
}

export class DefinirClaveDto {
  @IsString()
  @Length(20, 100)
  token!: string;

  @IsString()
  @Length(12, 200)
  clave!: string;
}

export class RecuperarClaveDto {
  @IsEmail()
  email!: string;
}

export class ReautenticarDto {
  @IsString()
  @MinLength(1)
  clave!: string;
}
