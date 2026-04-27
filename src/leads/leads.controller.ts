import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { FilterLeadDto } from './dto/filter-lead.dto';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { Request } from 'express';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  create(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }

  @Get()
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Get all leads with optional filtering' })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID',
    type: Number,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by lead status (NEW, CONTACTED)',
    enum: ['NEW', 'CONTACTED'],
  })
  @ApiResponse({
    status: 200,
    description: 'List of leads with apartment and project details',
  })
  findAll(
    @Query() filters: FilterLeadDto,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.leadsService.findAll(filters, request.developerId);
  }

  @Get(':id')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Get a specific lead by ID' })
  @ApiResponse({ status: 200, description: 'Lead found' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.leadsService.findOne(id, request.developerId);
  }

  @Patch(':id')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Update lead status' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLeadDto: UpdateLeadDto,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.leadsService.update(id, updateLeadDto, request.developerId);
  }

  @Post(':id/feedback-request')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Create feedback request link for lead' })
  @ApiResponse({
    status: 201,
    description: 'Feedback request link created successfully',
  })
  createFeedbackRequest(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.leadsService.createFeedbackRequest(id, request.developerId);
  }

  @Post('feedback/:token')
  @ApiOperation({ summary: 'Submit feedback by token' })
  @ApiResponse({ status: 201, description: 'Feedback submitted successfully' })
  submitFeedback(
    @Param('token') token: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    if (!body?.rating || body.rating < 1 || body.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    return this.leadsService.submitFeedback(token, body);
  }

  @Get('feedback/summary')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Get lead feedback summary for dashboard' })
  @ApiResponse({ status: 200, description: 'Feedback summary' })
  getFeedbackSummary(@Req() request: Request & { developerId?: number }) {
    return this.leadsService.getFeedbackSummary(request.developerId);
  }
}
