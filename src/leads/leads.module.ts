import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../common/services/notifications.service';
import { AuthModule } from '../auth/auth.module';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';

@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    PrismaService,
    NotificationsService,
    DeveloperAuthGuard,
  ],
})
export class LeadsModule {}
