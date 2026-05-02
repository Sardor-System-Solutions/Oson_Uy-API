import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { FloorsService } from './floors.service';
import { CreateProjectFloorDto } from './dto/create-project-floor.dto';
import { UpdateProjectFloorDto } from './dto/update-project-floor.dto';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';

@ApiTags('floors')
@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Get()
  @ApiOperation({ summary: 'List floors (optional filter by project)' })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiResponse({ status: 200 })
  findAll(@Query('projectId') projectId?: string) {
    const id = projectId ? Number(projectId) : undefined;
    return this.floorsService.findAll(
      id != null && !Number.isNaN(id) ? id : undefined,
    );
  }

  @Post()
  @UseGuards(DeveloperAuthGuard, ProjectMemberGuard)
  @ApiOperation({ summary: 'Create floor (developer must be project member)' })
  create(@Body() dto: CreateProjectFloorDto) {
    return this.floorsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Update floor' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectFloorDto,
    @Req() request: Request & { developerId?: number },
  ) {
    const developerId = request.developerId ?? 0;
    return this.floorsService.update(id, dto, developerId);
  }

  @Delete(':id')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Delete floor' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { developerId?: number },
  ) {
    const developerId = request.developerId ?? 0;
    return this.floorsService.remove(id, developerId);
  }
}
