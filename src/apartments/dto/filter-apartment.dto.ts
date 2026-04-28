import { IsOptional, IsNumber, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FilterApartmentDto {
  @ApiProperty({
    description: 'Filter by project ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @ApiProperty({
    description: 'Minimum price of the apartment (UZS)',
    example: 500000000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiProperty({
    description: 'Maximum price of the apartment (UZS)',
    example: 2000000000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiProperty({
    description: 'Number of rooms in the apartment',
    example: 3,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rooms?: number;
}
