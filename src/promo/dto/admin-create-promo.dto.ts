import { ApiProperty } from '@nestjs/swagger';
import { PromoBenefitType, SubscriptionPlan } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AdminCreatePromoDto {
  @ApiProperty({ example: 'FREE30' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ required: false, example: '30 days free for onboarding' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PromoBenefitType, example: PromoBenefitType.FREE_DAYS })
  @IsEnum(PromoBenefitType)
  benefitType: PromoBenefitType;

  @ApiProperty({ required: false, example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  freeDays?: number;

  @ApiProperty({ required: false, example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number;

  @ApiProperty({ required: false, enum: SubscriptionPlan, example: SubscriptionPlan.PRO })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiProperty({ required: false, example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiProperty({ required: false, example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ required: false, example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

