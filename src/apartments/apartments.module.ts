import { Module } from '@nestjs/common';
import { ApartmentsService } from './apartments.service';
import { ApartmentsController } from './apartments.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';

@Module({
  imports: [AuthModule],
  controllers: [ApartmentsController],
  providers: [
    ApartmentsService,
    PrismaService,
    DeveloperAuthGuard,
    ProjectMemberGuard,
  ],
})
export class ApartmentsModule {}
