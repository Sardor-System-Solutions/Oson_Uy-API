import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateProjectFloorDto } from './dto/create-project-floor.dto';
import { UpdateProjectFloorDto } from './dto/update-project-floor.dto';

const floorInclude = {
  project: true,
  areaOptions: { orderBy: { sortOrder: 'asc' as const } },
  layouts: { orderBy: { sortOrder: 'asc' as const } },
} as const;

@Injectable()
export class FloorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectFloorDto) {
    const layouts = dto.layouts ?? [];
    try {
      return await this.prisma.projectFloor.create({
        data: {
          projectId: dto.projectId,
          floor: dto.floor,
          pricePerM2: dto.pricePerM2,
          title: dto.title,
          sortOrder: dto.sortOrder ?? 0,
          areaOptions: {
            create: dto.areaOptions.map((a, i) => ({
              areaSqm: a.areaSqm,
              sortOrder: a.sortOrder ?? i,
            })),
          },
          layouts: {
            create: layouts.map((l, i) => ({
              imageUrl: l.imageUrl,
              title: l.title,
              sortOrder: l.sortOrder ?? i,
            })),
          },
        },
        include: floorInclude,
      });
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          `Floor ${dto.floor} already exists for this project`,
        );
      }
      throw e;
    }
  }

  async findAll(projectId?: number) {
    return this.prisma.projectFloor.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: [{ projectId: 'asc' }, { floor: 'desc' }],
      include: floorInclude,
    });
  }

  async findOne(id: number) {
    const row = await this.prisma.projectFloor.findUnique({
      where: { id },
      include: floorInclude,
    });
    if (!row) throw new NotFoundException('Floor not found');
    return row;
  }

  async update(id: number, dto: UpdateProjectFloorDto, developerId: number) {
    await this.assertAccess(id, developerId);
    try {
      const data: Prisma.ProjectFloorUpdateInput = {};
      if (dto.floor != null) data.floor = dto.floor;
      if (dto.pricePerM2 != null) data.pricePerM2 = dto.pricePerM2;
      if (dto.title !== undefined) data.title = dto.title;
      if (dto.sortOrder != null) data.sortOrder = dto.sortOrder;

      if (dto.areaOptions != null) {
        data.areaOptions = {
          deleteMany: {},
          create: dto.areaOptions.map((a, i) => ({
            areaSqm: a.areaSqm,
            sortOrder: a.sortOrder ?? i,
          })),
        };
      }

      if (dto.layouts != null) {
        data.layouts = {
          deleteMany: {},
          create: dto.layouts.map((l, i) => ({
            imageUrl: l.imageUrl,
            title: l.title,
            sortOrder: l.sortOrder ?? i,
          })),
        };
      }

      return await this.prisma.projectFloor.update({
        where: { id },
        data,
        include: floorInclude,
      });
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('This floor number already exists');
      }
      throw e;
    }
  }

  async remove(id: number, developerId: number) {
    await this.assertAccess(id, developerId);
    return this.prisma.projectFloor.delete({ where: { id } });
  }

  private async assertAccess(floorId: number, developerId: number) {
    const row = await this.prisma.projectFloor.findUnique({
      where: { id: floorId },
      include: { project: true },
    });
    if (!row) throw new NotFoundException('Floor not found');
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId: row.projectId, developerId },
    });
    if (!member) {
      throw new ForbiddenException('No access to this project floor');
    }
  }
}
