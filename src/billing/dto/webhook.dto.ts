import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class BillingWebhookDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  externalRef: string;

  @ApiProperty({ enum: ['PAID', 'FAILED', 'CANCELED'] })
  @IsIn(['PAID', 'FAILED', 'CANCELED'])
  status: 'PAID' | 'FAILED' | 'CANCELED';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  signature?: string;
}
