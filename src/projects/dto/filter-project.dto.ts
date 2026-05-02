import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
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
}
