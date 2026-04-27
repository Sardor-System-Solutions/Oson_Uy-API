import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService, ProjectLeadAnalytics } from './analytics.service';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { Request } from 'express';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('projects')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Get analytics for all projects' })
  @ApiResponse({
    status: 200,
    description: 'Lead count grouped by project',
    isArray: true,
  })
  async getProjectsAnalytics(
    @Req() request: Request & { developerId?: number },
  ): Promise<ProjectLeadAnalytics[]> {
    return this.analyticsService.getProjectsAnalytics(request.developerId);
  }
}
