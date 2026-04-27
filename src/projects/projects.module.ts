import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    PrismaService,
    DeveloperAuthGuard,
    ProjectMemberGuard,
  ],
})
export class ProjectsModule {}
