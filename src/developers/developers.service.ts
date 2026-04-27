import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { UpdateDeveloperDto } from './dto/update-developer.dto';

@Injectable()
export class DevelopersService {
  constructor(private prisma: PrismaService) {}

  async create(createDeveloperDto: CreateDeveloperDto) {
    return this.prisma.developer.create({
      data: createDeveloperDto,
    });
  }

  async findAll() {
    return this.prisma.developer.findMany({
      include: {
        projects: true,
      },
    });
  }

  async findById(id: number) {
    return this.prisma.developer.findUnique({
      where: { id },
      include: {
        projects: true,
      },
    });
  }

  async update(id: number, updateDeveloperDto: UpdateDeveloperDto) {
    return this.prisma.developer.update({
      where: { id },
      data: updateDeveloperDto,
      include: {
        projects: true,
      },
    });
  }
}
