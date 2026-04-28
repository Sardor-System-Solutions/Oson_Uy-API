import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FilterProjectDto {
  @ApiProperty({
    description: 'Minimum price of apartments in the project',
    example: 100000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiProperty({
    description: 'Maximum price of apartments in the project',
    example: 500000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiProperty({
    description: 'Minimum apartment price per m² in project (UZS)',
    example: 6000000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pricePerM2Min?: number;

  @ApiProperty({
    description: 'Maximum apartment price per m² in project (UZS)',
    example: 15000000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pricePerM2Max?: number;

  @ApiProperty({
    description: 'Number of rooms in apartments',
    example: 3,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rooms?: number;

  @ApiProperty({
    description: 'Location/city of the project',
    example: 'Tashkent',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;
}
