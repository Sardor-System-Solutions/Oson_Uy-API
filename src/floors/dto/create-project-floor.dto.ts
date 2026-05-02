import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class FloorAreaOptionDto {
  @ApiProperty({ description: 'Area variant in m²' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  areaSqm: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class FloorLayoutDto {
  @ApiProperty({ description: 'Layout / plan image URL' })
  @IsString()
  imageUrl: string;

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

  @ApiProperty({ type: [FloorAreaOptionDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FloorAreaOptionDto)
  areaOptions: FloorAreaOptionDto[];

  @ApiProperty({ type: [FloorLayoutDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FloorLayoutDto)
  layouts?: FloorLayoutDto[];

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
