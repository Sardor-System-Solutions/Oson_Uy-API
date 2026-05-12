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
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { ProjectMemberGuard } from '../common/guards/project-member.guard';
import { ProjectUltimatePlanGuard } from '../common/guards/project-ultimate-plan.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FilterCustomerDto } from './dto/filter-customer.dto';
import { CreateCustomerPaymentDto } from './dto/create-customer-payment.dto';
import { UpdateCustomerPaymentDto } from './dto/update-customer-payment.dto';
import { CreateCustomerDocumentDto } from './dto/create-customer-document.dto';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('projects/:projectId/customers')
@UseGuards(DeveloperAuthGuard, ProjectMemberGuard, ProjectUltimatePlanGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List buyers (CRM) for project' })
  list(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() query: FilterCustomerDto,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.customersService.list(projectId, request.developerId!, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create buyer + access code' })
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: CreateCustomerDto,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.customersService.create(projectId, dto, request.developerId!);
  }

  @Get(':customerId')
  @ApiOperation({ summary: 'Buyer detail' })
  findOne(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.customersService.findOne(
      projectId,
      customerId,
      request.developerId!,
    );
  }

  @Patch(':customerId')
  @ApiOperation({ summary: 'Update buyer' })
  update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: UpdateCustomerDto,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.customersService.update(
      projectId,
      customerId,
      dto,
      request.developerId!,
    );
  }

  @Post(':customerId/access-code')
  @ApiOperation({ summary: 'Regenerate access code' })
  regenerateCode(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.customersService.regenerateAccessCode(
      projectId,
      customerId,
      request.developerId!,
    );
  }

  @Post(':customerId/payments')
  @ApiOperation({ summary: 'Record payment' })
  addPayment(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateCustomerPaymentDto,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.customersService.addPayment(
      projectId,
      customerId,
      dto,
      request.developerId!,
    );
  }

  @Patch(':customerId/payments/:paymentId')
  @ApiOperation({ summary: 'Edit payment' })
  updatePayment(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Body() dto: UpdateCustomerPaymentDto,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.customersService.updatePayment(
      projectId,
      customerId,
      paymentId,
      dto,
      request.developerId!,
    );
  }

  @Delete(':customerId/payments/:paymentId')
  @ApiOperation({ summary: 'Delete payment' })
  removePayment(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.customersService.removePayment(
      projectId,
      customerId,
      paymentId,
      request.developerId!,
    );
  }

  @Post(':customerId/documents')
  @ApiOperation({ summary: 'Attach document (PDF URL)' })
  addDocument(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: CreateCustomerDocumentDto,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.customersService.addDocument(
      projectId,
      customerId,
      dto,
      request.developerId!,
    );
  }

  @Delete(':customerId/documents/:documentId')
  @ApiOperation({ summary: 'Remove document' })
  removeDocument(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.customersService.removeDocument(
      projectId,
      customerId,
      documentId,
      request.developerId!,
    );
  }
}
