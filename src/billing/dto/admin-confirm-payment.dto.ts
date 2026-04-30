import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AdminConfirmPaymentDto {
  @ApiProperty({
    description: 'Invoice ID to confirm as paid',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  invoiceId: number;
}
