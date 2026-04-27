import { ApiProperty } from '@nestjs/swagger';
import { BillingProvider, SubscriptionPlan } from '@prisma/client';
import { IsEnum, IsInt, IsPositive } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.PRO })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiProperty({ enum: BillingProvider, example: BillingProvider.PAYME })
  @IsEnum(BillingProvider)
  provider: BillingProvider;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  projectId: number;
}
