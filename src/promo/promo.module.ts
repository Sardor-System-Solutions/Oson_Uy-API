import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PromoController } from './promo.controller';
import { PromoService } from './promo.service';

@Module({
  controllers: [PromoController],
  providers: [PromoService, PrismaService],
})
export class PromoModule {}

