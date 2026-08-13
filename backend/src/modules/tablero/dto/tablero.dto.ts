import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class ExportarTableroQueryDto {
  @IsOptional()
  @IsIn(['csv'])
  formato?: 'csv';

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}
