import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ApartmentsService } from './apartments.service';
import { ApartmentsController } from './apartments.controller';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { ProjectUltimatePlanGuard } from '../common/guards/project-ultimate-plan.guard';

@Module({
  imports: [AuthModule],
  controllers: [ApartmentsController],
  providers: [
    ApartmentsService,
    PrismaService,
    DeveloperAuthGuard,
    ProjectMemberGuard,
    ProjectUltimatePlanGuard,
  ],
  exports: [ApartmentsService],
})
export class ApartmentsModule {}
