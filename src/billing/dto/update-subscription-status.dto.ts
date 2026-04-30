import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';
import { IsEnum, IsNumber } from 'class-validator';

export class UpdateSubscriptionStatusDto {
  @ApiProperty({
    description: 'Project ID',
    example: 1,
  })
  @IsNumber()
  projectId: number;

  @ApiProperty({
    description: 'Subscription status',
    enum: SubscriptionStatus,
    example: 'ACTIVE',
  })
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;
}
