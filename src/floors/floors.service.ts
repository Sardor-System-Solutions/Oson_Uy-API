import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProjectFloorDto } from './dto/create-project-floor.dto';
import { UpdateProjectFloorDto } from './dto/update-project-floor.dto';

@Injectable()
export class FloorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProjectFloorDto) {
    try {
      return await this.prisma.projectFloor.create({
        data: {
          projectId: dto.projectId,
          floor: dto.floor,
          pricePerM2: dto.pricePerM2,
          areaSqm: dto.areaSqm,
          sampleImageUrl: dto.sampleImageUrl,
          title: dto.title,
          sortOrder: dto.sortOrder ?? 0,
        },
        include: { project: true },
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
      include: { project: true },
    });
  }

  async findOne(id: number) {
    const row = await this.prisma.projectFloor.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!row) throw new NotFoundException('Floor not found');
    return row;
  }

  async update(id: number, dto: UpdateProjectFloorDto, developerId: number) {
    await this.assertAccess(id, developerId);
    try {
      return await this.prisma.projectFloor.update({
        where: { id },
        data: {
          ...(dto.floor != null ? { floor: dto.floor } : {}),
          ...(dto.pricePerM2 != null ? { pricePerM2: dto.pricePerM2 } : {}),
          ...(dto.areaSqm != null ? { areaSqm: dto.areaSqm } : {}),
          ...(dto.sampleImageUrl !== undefined
            ? { sampleImageUrl: dto.sampleImageUrl }
            : {}),
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
        },
        include: { project: true },
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
