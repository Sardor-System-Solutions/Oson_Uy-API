import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { FilterApartmentDto } from './dto/filter-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';

@Injectable()
export class ApartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(createApartmentDto: CreateApartmentDto) {
    return this.prisma.apartment.create({
      data: createApartmentDto,
      include: {
        project: true,
        leads: true,
      },
    });
  }

  async findAll(filters?: FilterApartmentDto) {
    const where: Prisma.ApartmentWhereInput = {};

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters?.minPrice || filters?.maxPrice) {
      where.price = {
        ...(filters?.minPrice ? { gte: filters.minPrice } : {}),
        ...(filters?.maxPrice ? { lte: filters.maxPrice } : {}),
      };
    }

    if (filters?.rooms) {
      where.rooms = filters.rooms;
    }

    return this.prisma.apartment.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        project: true,
        leads: true,
      },
    });
  }

  async update(id: number, updateApartmentDto: UpdateApartmentDto) {
    return this.prisma.apartment.update({
      where: { id },
      data: updateApartmentDto,
      include: {
        project: true,
        leads: true,
      },
    });
  }

  async belongsToDeveloper(id: number, developerId: number) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });
    if (!apartment) return false;
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId: apartment.projectId,
        developerId,
      },
    });
    return Boolean(member);
  }
}
