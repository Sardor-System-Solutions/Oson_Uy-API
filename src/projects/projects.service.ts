import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { FilterProjectDto } from './dto/filter-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    developer: true;
    media: true;
    apartments: { include: { leads: true } };
    floors: true;
    leads: { include: { feedback: true } };
    subscription: true;
  };
}>;

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto) {
    const { imageUrls, ...projectData } = createProjectDto;
    this.ensureImageQuota(imageUrls, SubscriptionPlan.START);
    const project = await this.prisma.project.create({
      data: {
        ...projectData,
        media: imageUrls?.length
          ? {
              create: imageUrls.map((imageUrl, index) => ({
                imageUrl,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        developer: true,
        apartments: true,
        floors: true,
        media: true,
      },
    });
    await this.prisma.projectSubscription.create({
      data: {
        projectId: project.id,
        plan: SubscriptionPlan.START,
        status: SubscriptionStatus.TRIAL,
        trialStartsAt: new Date(),
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await this.prisma.projectMember.upsert({
      where: {
        projectId_developerId: {
          projectId: project.id,
          developerId: project.developerId,
        },
      },
      update: {},
      create: {
        projectId: project.id,
        developerId: project.developerId,
        role: 'OWNER',
      },
    });
    return project;
  }

  async findAll(filters?: FilterProjectDto) {
    const where: Prisma.ProjectWhereInput = {};

    if (filters?.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        developer: true,
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        apartments: {
          include: {
            leads: true,
          },
        },
        floors: true,
        leads: {
          include: {
            feedback: true,
          },
        },
        subscription: true,
      },
    });

    const filtered = projects.filter((project) =>
      this.projectMatchesFilters(project, filters),
    );

    return filtered.map((project) => this.enrichProject(project));
  }

  async findOne(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        developer: true,
        apartments: {
          include: {
            leads: true,
          },
        },
        floors: true,
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        leads: {
          include: {
            feedback: true,
          },
        },
        subscription: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return this.enrichProject(project);
  }

  async findFullById(id: number) {
    return this.findOne(id);
  }

  async update(id: number, updateProjectDto: UpdateProjectDto) {
    const current = await this.findOne(id);
    const { imageUrls, ...projectData } = updateProjectDto;
    this.ensureImageQuota(
      imageUrls,
      current.subscription?.plan ?? SubscriptionPlan.START,
    );

    return this.prisma.project.update({
      where: { id },
      data: {
        ...projectData,
        media: imageUrls
          ? {
              deleteMany: {},
              create: imageUrls.map((imageUrl, index) => ({
                imageUrl,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        developer: true,
        apartments: true,
        floors: true,
        media: true,
        subscription: true,
      },
    });
  }

  private projectMatchesFilters(
    project: ProjectWithRelations,
    filters?: FilterProjectDto,
  ): boolean {
    if (!filters) return true;

    const hasPrice =
      filters.minPrice != null ||
      filters.maxPrice != null ||
      filters.pricePerM2Min != null ||
      filters.pricePerM2Max != null;

    const aptMatch = project.apartments.some((a) =>
      this.apartmentMatchesFilters(a, filters),
    );
    const floorMatch = project.floors.some((f) =>
      this.floorMatchesFilters(f, filters),
    );

    if (filters.rooms != null) {
      return aptMatch;
    }

    if (!hasPrice) {
      return true;
    }

    return aptMatch || floorMatch;
  }

  private apartmentMatchesFilters(
    apartment: ProjectWithRelations['apartments'][0],
    filters: FilterProjectDto,
  ): boolean {
    if (filters.rooms != null && apartment.rooms !== filters.rooms) {
      return false;
    }
    if (filters.minPrice != null && apartment.price < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice != null && apartment.price > filters.maxPrice) {
      return false;
    }
    if (filters.pricePerM2Min != null || filters.pricePerM2Max != null) {
      if (!apartment.area) return false;
      const perM2 = apartment.price / apartment.area;
      if (
        filters.pricePerM2Min != null &&
        perM2 < filters.pricePerM2Min
      ) {
        return false;
      }
      if (
        filters.pricePerM2Max != null &&
        perM2 > filters.pricePerM2Max
      ) {
        return false;
      }
    }
    return true;
  }

  private floorMatchesFilters(
    floor: ProjectWithRelations['floors'][0],
    filters: FilterProjectDto,
  ): boolean {
    const total = floor.pricePerM2 * floor.areaSqm;
    if (filters.minPrice != null && total < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice != null && total > filters.maxPrice) {
      return false;
    }
    if (
      filters.pricePerM2Min != null &&
      floor.pricePerM2 < filters.pricePerM2Min
    ) {
      return false;
    }
    if (
      filters.pricePerM2Max != null &&
      floor.pricePerM2 > filters.pricePerM2Max
    ) {
      return false;
    }
    return true;
  }

  private enrichProject(project: ProjectWithRelations) {
    const feedbacks = project.leads
      .map((lead) => lead.feedback)
      .filter((feedback) => Boolean(feedback?.rating));
    const reviewsCount = feedbacks.length;
    const avgRating = reviewsCount
      ? Number(
          (
            feedbacks.reduce((sum, review) => sum + (review.rating ?? 0), 0) /
            reviewsCount
          ).toFixed(1),
        )
      : null;
    const reviews = feedbacks.slice(0, 5).map((feedback, index) => ({
      id: index + 1,
      rating: feedback.rating ?? 0,
      comment: feedback.comment,
    }));

    return {
      ...project,
      isPopular:
        project.subscription?.plan === SubscriptionPlan.PREMIUM ||
        project.subscription?.plan === SubscriptionPlan.ULTIMATE,
      badgeVerified:
        project.subscription?.plan === SubscriptionPlan.PRO ||
        project.subscription?.plan === SubscriptionPlan.PREMIUM ||
        project.subscription?.plan === SubscriptionPlan.ULTIMATE,
      badgeTrusted: project.subscription?.plan === SubscriptionPlan.ULTIMATE,
      topInCatalog:
        project.subscription?.plan === SubscriptionPlan.PREMIUM ||
        project.subscription?.plan === SubscriptionPlan.ULTIMATE,
      topInHome: project.subscription?.plan === SubscriptionPlan.ULTIMATE,
      reviews,
      reviewsCount,
      avgRating,
    };
  }

  private ensureImageQuota(
    imageUrls: string[] | undefined,
    plan: SubscriptionPlan,
  ) {
    if (!imageUrls) return;
    const limits: Record<SubscriptionPlan, number> = {
      START: 3,
      PRO: 5,
      PREMIUM: 7,
      ULTIMATE: Number.POSITIVE_INFINITY,
    };
    if (imageUrls.length > limits[plan]) {
      throw new NotFoundException(
        `Plan ${plan} allows maximum ${limits[plan]} images`,
      );
    }
  }
}
