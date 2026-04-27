import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { FilterProjectDto } from './dto/filter-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

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
    const apartmentFilter = this.buildApartmentFilter(filters);

    if (filters?.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (apartmentFilter) {
      where.apartments = {
        some: apartmentFilter,
      };
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        developer: true,
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        apartments: {
          where: apartmentFilter,
          include: {
            leads: true,
          },
        },
        leads: {
          include: {
            feedback: true,
          },
        },
        subscription: true,
      },
    });

    const filteredByPerM2 = projects.filter((project) => {
      if (!filters?.pricePerM2Min && !filters?.pricePerM2Max) return true;
      return project.apartments.some((apartment) => {
        if (!apartment.area) return false;
        const perM2 = apartment.price / apartment.area;
        if (filters.pricePerM2Min && perM2 < filters.pricePerM2Min)
          return false;
        if (filters.pricePerM2Max && perM2 > filters.pricePerM2Max)
          return false;
        return true;
      });
    });

    return filteredByPerM2.map((project) => {
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
      const reviews = feedbacks
        .slice(0, 5)
        .map((feedback, index) => ({
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
    });
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
        media: true,
        subscription: true,
      },
    });
  }

  private buildApartmentFilter(
    filters?: FilterProjectDto,
  ): Prisma.ApartmentWhereInput | undefined {
    const where: Prisma.ApartmentWhereInput = {};

    if (filters?.minPrice || filters?.maxPrice) {
      where.price = {
        ...(filters?.minPrice ? { gte: filters.minPrice } : {}),
        ...(filters?.maxPrice ? { lte: filters.maxPrice } : {}),
      };
    }

    if (filters?.rooms) {
      where.rooms = filters.rooms;
    }

    return Object.keys(where).length > 0 ? where : undefined;
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
