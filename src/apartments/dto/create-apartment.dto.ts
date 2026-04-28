import {
  IsNotEmpty,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApartmentDto {
  @ApiProperty({
    description: 'The ID of the project this apartment belongs to',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  projectId: number;

  @ApiProperty({
    description: 'The price of the apartment in UZS',
    example: 850000000,
  })
  @IsNotEmpty()
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'Number of rooms in the apartment',
    example: 3,
  })
  @IsNotEmpty()
  @IsInt()
  rooms: number;

  @ApiProperty({
    description: 'Total area of the apartment in square meters',
    example: 85.5,
  })
  @IsNotEmpty()
  @IsNumber()
  area: number;

  @ApiProperty({
    description: 'Floor number where the apartment is located',
    example: 5,
  })
  @IsNotEmpty()
  @IsInt()
  floor: number;

  @ApiProperty({
    description: 'Image URL for the apartment (optional)',
    example: 'https://example.com/apartment-image.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
