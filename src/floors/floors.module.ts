import { Module } from '@nestjs/common';
import { FloorsService } from './floors.service';
import { FloorsController } from './floors.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';

@Module({
  imports: [AuthModule],
  controllers: [FloorsController],
  providers: [
    FloorsService,
    PrismaService,
    DeveloperAuthGuard,
    ProjectMemberGuard,
  ],
  exports: [FloorsService],
})
export class FloorsModule {}
