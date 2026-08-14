import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateAppModuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(200)
  route_path?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  nav_sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_system?: boolean;
}
