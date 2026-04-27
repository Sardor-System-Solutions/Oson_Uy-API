import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';

@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [BillingService, PrismaService, DeveloperAuthGuard],
})
export class BillingModule {}
