import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BillingProvider } from '@prisma/client';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { Request } from 'express';
import { BillingWebhookDto } from './dto/webhook.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({ summary: 'Create Payme/Click checkout invoice' })
  @ApiResponse({ status: 201, description: 'Checkout created successfully' })
  createCheckout(
    @Body() dto: CreateCheckoutDto,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.billingService.createCheckout(
      dto.projectId,
      dto.plan,
      dto.provider,
      request.developerId,
    );
  }

  @Post('webhook/payme')
  @ApiOperation({ summary: 'Payme webhook callback' })
  handlePaymeWebhook(@Body() body: BillingWebhookDto) {
    return this.billingService.handleWebhook(BillingProvider.PAYME, body);
  }

  @Post('webhook/click')
  @ApiOperation({ summary: 'Click webhook callback' })
  handleClickWebhook(@Body() body: BillingWebhookDto) {
    return this.billingService.handleWebhook(BillingProvider.CLICK, body);
  }
}
