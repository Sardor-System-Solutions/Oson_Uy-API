import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class RedeemPromoDto {
  @ApiProperty({ example: 'FREE30' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 1, description: 'Project ID to apply promo to' })
  @IsNumber()
  projectId: number;

  @ApiProperty({
    example: 'Optional note',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

