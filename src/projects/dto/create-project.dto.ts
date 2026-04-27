import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @ApiProperty({
    description: 'The name of the real estate project',
    example: 'Sunset Gardens',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The location/city of the project',
    example: 'Tashkent',
  })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({
    description: 'District of project inside city/region',
    example: 'Siyob',
    required: false,
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({
    description: 'Short project description',
    example: 'Comfort-class project near city center with family facilities.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Project advantages list',
    example: ['Close to center', 'Underground parking', 'Kindergarten nearby'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  advantages?: string[];

  @ApiProperty({
    description: 'Map embed URL (Google/2GIS/Yandex embed link)',
    example: 'https://www.google.com/maps/embed?...',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  mapEmbedUrl?: string;

  @ApiProperty({
    description: 'Total number of floors in the project',
    example: 16,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalFloors?: number;

  @ApiProperty({
    description: 'Total number of apartments/units in the project',
    example: 220,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalUnits?: number;

  @ApiProperty({
    description: 'The expected delivery date of the project',
    example: '2025-12-31',
  })
  @IsNotEmpty()
  @IsString()
  deliveryDate: string;

  @ApiProperty({
    description:
      'Main image URL for the project (optional, will use placeholder if not provided)',
    example: 'https://example.com/project-image.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'Video URL for the project (optional)',
    example: 'https://example.com/project-video.mp4',
    required: false,
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiProperty({
    description: 'Additional project gallery image URLs (optional)',
    example: [
      'https://example.com/project-1.jpg',
      'https://example.com/project-2.jpg',
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiProperty({
    description: 'The ID of the developer owning this project',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  developerId: number;
}
