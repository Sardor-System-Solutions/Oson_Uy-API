import {
  IsNotEmpty,
  IsString,
  IsInt,
  Matches,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty({
    description: 'The full name of the lead/customer',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description:
      'Phone number in Uzbekistan format (998XXXXXXXXX or +998XXXXXXXXX)',
    example: '998901234567',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(\+998|998)?[0-9]{9}$/, {
    message: 'Phone must be a valid Uzbekistan phone number',
  })
  phone: string;

  @ApiProperty({
    description: 'The ID of the apartment the lead is interested in',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  apartmentId?: number;

  @ApiProperty({
    description: 'The ID of the project floor the lead is interested in',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floorId?: number;

  @ApiProperty({
    description: 'The ID of the project the lead is interested in',
    example: 1,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  projectId: number;
}
