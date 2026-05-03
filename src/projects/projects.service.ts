import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Developer,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { FilterProjectDto } from './dto/filter-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    developer: true;
    media: true;
    floors: {
      include: { areaOptions: true; layouts: true };
    };
    leads: { include: { feedback: true } };
    subscription: true;
  };
}>;

type CarouselProjectPayload = {
  id: number;
  name: string;
  location: string;
  district: string | null;
  imageUrl: string;
  deliveryDate: string;
  hasInstallment: boolean;
  latitude: number | null;
  longitude: number | null;
  floors: { pricePerM2: number }[];
  media: { imageUrl: string }[];
};

type CarouselProjectSummary = {
  id: number;
  name: string;
  location: string;
  district: string | null;
  imageUrl: string;
  deliveryDate: string;
  hasInstallment: boolean;
  priceFrom: number | null;
};

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  private static readonly floorInclude = {
    areaOptions: { orderBy: { sortOrder: 'asc' as const } },
    layouts: { orderBy: { sortOrder: 'asc' as const } },
  };

  private static readonly carouselSelect = {
    id: true,
    name: true,
    location: true,
    district: true,
    imageUrl: true,
    deliveryDate: true,
    hasInstallment: true,
    latitude: true,
    longitude: true,
    floors: { select: { pricePerM2: true } },
    media: {
      orderBy: { sortOrder: 'asc' as const },
      take: 1,
      select: { imageUrl: true },
    },
  } satisfies Prisma.ProjectSelect;

  static toCatalogDeveloper(developer: Developer) {
    return {
      id: developer.id,
      name: developer.name,
      email: developer.email,
      qrCodeUrl: developer.qrCodeUrl,
      phone: developer.phone,
      legalAddress: developer.legalAddress,
      officeAddress: developer.officeAddress,
      website: developer.website,
      description: developer.description,
      logoUrl: developer.logoUrl,
      createdAt: developer.createdAt,
    };
  }

  private static haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

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
        floors: { include: ProjectsService.floorInclude },
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
    return {
      ...project,
      developer: ProjectsService.toCatalogDeveloper(project.developer),
    };
  }

  async findAll(filters?: FilterProjectDto) {
    const where: Prisma.ProjectWhereInput = {};

    if (filters?.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters?.hasInstallment === true) {
      where.hasInstallment = true;
    }
    if (filters?.hasInstallment === false) {
      where.hasInstallment = false;
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        developer: true,
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        floors: {
          include: ProjectsService.floorInclude,
        },
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
    const project = await this.loadProjectOrThrow(id);
    const enriched = this.enrichProject(project);
    const [siblingProjects, nearbyProjects] = await Promise.all([
      this.findSiblingProjects(project),
      this.findNearbyProjects(project),
    ]);
    return { ...enriched, siblingProjects, nearbyProjects };
  }

  async findFullById(id: number) {
    return this.findOne(id);
  }

  async update(id: number, updateProjectDto: UpdateProjectDto) {
    const currentRaw = await this.loadProjectOrThrow(id);
    const { imageUrls, ...projectData } = updateProjectDto;
    this.ensureImageQuota(
      imageUrls,
      currentRaw.subscription?.plan ?? SubscriptionPlan.START,
    );

    const updated = await this.prisma.project.update({
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
        floors: { include: ProjectsService.floorInclude },
        media: true,
        subscription: true,
      },
    });
    return {
      ...updated,
      developer: ProjectsService.toCatalogDeveloper(updated.developer),
    };
  }

  private async loadProjectOrThrow(id: number): Promise<ProjectWithRelations> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        developer: true,
        floors: {
          include: ProjectsService.floorInclude,
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

    return project;
  }

  private toCarouselProject(row: CarouselProjectPayload): CarouselProjectSummary {
    const prices = row.floors.map((f) => f.pricePerM2).filter((p) => p > 0);
    const priceFrom = prices.length ? Math.min(...prices) : null;
    const thumb =
      row.imageUrl?.trim() || row.media[0]?.imageUrl?.trim() || '';
    return {
      id: row.id,
      name: row.name,
      location: row.location,
      district: row.district,
      imageUrl: thumb,
      deliveryDate: row.deliveryDate,
      hasInstallment: row.hasInstallment,
      priceFrom,
    };
  }

  private async findSiblingProjects(project: ProjectWithRelations) {
    const rows = await this.prisma.project.findMany({
      where: { developerId: project.developerId, id: { not: project.id } },
      take: 12,
      orderBy: { id: 'desc' },
      select: ProjectsService.carouselSelect,
    });
    return rows.map((r) => this.toCarouselProject(r as CarouselProjectPayload));
  }

  private async findNearbyProjects(project: ProjectWithRelations) {
    const limit = 12;
    const picked = new Set<number>([project.id]);
    const out: CarouselProjectSummary[] = [];

    const pushUnique = (rows: CarouselProjectPayload[], need: number) => {
      for (const r of rows) {
        if (out.length >= need) return;
        if (picked.has(r.id)) continue;
        picked.add(r.id);
        out.push(this.toCarouselProject(r));
      }
    };

    if (project.latitude != null && project.longitude != null) {
      const withCoords = await this.prisma.project.findMany({
        where: {
          id: { not: project.id },
          latitude: { not: null },
          longitude: { not: null },
          location: { equals: project.location, mode: 'insensitive' },
        },
        take: 80,
        select: ProjectsService.carouselSelect,
      });
      const sorted = (withCoords as CarouselProjectPayload[])
        .map((p) => ({
          p,
          km: ProjectsService.haversineKm(
            project.latitude!,
            project.longitude!,
            p.latitude!,
            p.longitude!,
          ),
        }))
        .sort((a, b) => a.km - b.km)
        .map((x) => x.p);
      pushUnique(sorted, limit);
    }

    if (out.length < limit && project.district) {
      const rows = await this.prisma.project.findMany({
        where: {
          id: { notIn: [...picked] },
          district: { equals: project.district, mode: 'insensitive' },
        },
        take: limit - out.length + 5,
        select: ProjectsService.carouselSelect,
      });
      pushUnique(rows as CarouselProjectPayload[], limit);
    }

    if (out.length < limit) {
      const rows = await this.prisma.project.findMany({
        where: {
          id: { notIn: [...picked] },
          location: { equals: project.location, mode: 'insensitive' },
        },
        take: limit - out.length + 8,
        select: ProjectsService.carouselSelect,
      });
      pushUnique(rows as CarouselProjectPayload[], limit);
    }

    return out;
  }

  private projectMatchesFilters(
    project: ProjectWithRelations,
    filters?: FilterProjectDto,
  ): boolean {
    if (!filters) return true;

    if (
      filters.hasInstallment === true &&
      project.hasInstallment !== true
    ) {
      return false;
    }
    if (
      filters.hasInstallment === false &&
      project.hasInstallment !== false
    ) {
      return false;
    }

    const hasPrice =
      filters.pricePerM2Min != null || filters.pricePerM2Max != null;

    if (!hasPrice) {
      return true;
    }

    return project.floors.some((f) => this.floorMatchesFilters(f, filters));
  }

  private floorMatchesFilters(
    floor: ProjectWithRelations['floors'][0],
    filters: FilterProjectDto,
  ): boolean {
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

    const { developer, ...rest } = project;

    return {
      ...rest,
      developer: ProjectsService.toCatalogDeveloper(developer),
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
