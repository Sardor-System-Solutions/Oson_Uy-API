import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FilterProjectDto {
  @ApiProperty({
    description: 'Minimum price per m² in project (UZS)',
    example: 6000000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pricePerM2Min?: number;

  @ApiProperty({
    description: 'Maximum price per m² in project (UZS)',
    example: 15000000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pricePerM2Max?: number;

  @ApiProperty({
    description: 'Location/city of the project',
    example: 'Tashkent',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Filter by installment availability',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  hasInstallment?: boolean;
}
