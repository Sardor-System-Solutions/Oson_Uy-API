import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { FilterProjectDto } from './dto/filter-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { Request } from 'express';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @Req() request: Request & { developerId?: number },
  ) {
    if (!request.developerId) {
      throw new BadRequestException('Developer identity is required');
    }
    return this.projectsService.create({
      ...createProjectDto,
      developerId: request.developerId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects with optional filtering' })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Minimum apartment price in project',
    type: Number,
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Maximum apartment price in project',
    type: Number,
  })
  @ApiQuery({
    name: 'rooms',
    required: false,
    description: 'Exact number of rooms in apartments',
    type: Number,
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Project location/city',
    type: String,
  })
  @ApiQuery({
    name: 'pricePerM2Min',
    required: false,
    description: 'Minimum apartment price per m² in project',
    type: Number,
  })
  @ApiQuery({
    name: 'pricePerM2Max',
    required: false,
    description: 'Maximum apartment price per m² in project',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'List of all projects with developer and apartments',
  })
  findAll(@Query() filters: FilterProjectDto) {
    return this.projectsService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Project details with developer and apartments',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Get(':id/full')
  @ApiOperation({ summary: 'Get full project details with apartments' })
  @ApiParam({ name: 'id', description: 'Project ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Project full details with apartments',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findFull(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findFullById(id);
  }

  @Patch(':id')
  @UseGuards(DeveloperAuthGuard, ProjectMemberGuard)
  @ApiOperation({ summary: 'Update project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID', type: Number })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id/reviews')
  @UseGuards(DeveloperAuthGuard, ProjectMemberGuard)
  @ApiOperation({
    summary:
      'Deprecated admin review endpoint (reviews are collected from user feedback only)',
  })
  @ApiParam({ name: 'id', description: 'Project ID', type: Number })
  disableAdminReviewCreation() {
    throw new BadRequestException(
      'Project reviews are collected from users via feedback flow only',
    );
  }
}
