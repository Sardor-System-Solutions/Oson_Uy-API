import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface ProjectLeadAnalytics {
  projectId: number;
  leadsCount: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getProjectsAnalytics(developerId?: number): Promise<ProjectLeadAnalytics[]> {
    const groupedLeads = await this.prisma.lead.groupBy({
      by: ['projectId'],
      where: {
        projectId: {
          not: null,
        },
        ...(developerId
          ? {
              project: {
                developerId,
              },
            }
          : {}),
      },
      _count: {
        id: true,
      },
    });

    return groupedLeads
      .filter((item) => item.projectId !== null)
      .map((item) => ({
        projectId: item.projectId,
        leadsCount: item._count.id,
      }));
  }
}
