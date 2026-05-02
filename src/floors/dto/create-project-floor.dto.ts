import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProjectFloorDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  projectId: number;

  @ApiProperty({ description: 'Floor number (1 = first floor)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  floor: number;

  @ApiProperty({ description: 'Price per m² in UZS' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerM2: number;

  @ApiProperty({ description: 'Representative area on this floor, m²' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaSqm: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sampleImageUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
