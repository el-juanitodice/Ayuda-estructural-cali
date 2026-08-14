import { IsString, Length } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsString()
  @Length(2, 255)
  description!: string;
}
