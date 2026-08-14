import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsUUID, ValidateNested } from 'class-validator';

export class RolePermissionMatrixRowDto {
  @IsUUID()
  app_module_id!: string;

  @IsBoolean()
  r!: boolean;

  @IsBoolean()
  w!: boolean;

  @IsBoolean()
  u!: boolean;

  @IsBoolean()
  d!: boolean;
}

export class SetRolePermissionMatrixDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RolePermissionMatrixRowDto)
  rows!: RolePermissionMatrixRowDto[];
}
