import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class AdminUpdateSubscriptionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  projectId: number;

  @ApiProperty({ enum: SubscriptionStatus, required: false, example: SubscriptionStatus.ACTIVE })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({ enum: SubscriptionPlan, required: false, example: SubscriptionPlan.PRO })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiProperty({ required: false, example: '2026-06-30T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;

  @ApiProperty({ required: false, example: 30, description: 'Extend currentPeriodEnd by N days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  extendDays?: number;
}

