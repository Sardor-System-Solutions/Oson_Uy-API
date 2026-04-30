import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { BillingProvider } from '@prisma/client';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { UpdateSubscriptionStatusDto } from './dto/update-subscription-status.dto';
import { AdminConfirmPaymentDto } from './dto/admin-confirm-payment.dto';
import { DeveloperAuthGuard } from '../common/guards/developer-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { Request } from 'express';
import { BillingWebhookDto } from './dto/webhook.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({
    summary: 'Create manual payment request for subscription',
    description:
      'Creates a new payment invoice for the specified project and plan. ' +
      'Returns payment instructions (card transfer or cash). ' +
      'Requires developer authentication.',
  })
  @ApiResponse({
    status: 201,
    description: 'Manual payment request created successfully',
    schema: {
      example: {
        invoiceId: 1,
        externalRef: '550e8400-e29b-41d4-a716-446655440000',
        amountUzs: 3200000,
        status: 'PENDING',
        paymentMethod: 'CARD_TRANSFER',
        instructions: {
          type: 'CARD_TRANSFER',
          cardNumber: '8600 **** **** 1234',
          cardHolder: 'COMPANY NAME',
          comment: 'Укажите в комментарии к переводу: 550e8400-...',
        },
        message:
          'Заявка на оплату создана. После подтверждения менеджером подписка будет активирована.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Project not found or validation error' })
  @ApiResponse({ status: 403, description: 'No access to this project workspace' })
  createCheckout(
    @Body() dto: CreateCheckoutDto,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.billingService.createCheckout(
      dto.projectId,
      dto.plan,
      dto.paymentMethod,
      dto.note,
      request.developerId,
    );
  }

  @Post('webhook/payme')
  @ApiOperation({
    summary: 'Payme webhook callback',
    description: 'Handles payment status updates from Payme provider. Verifies HMAC signature.',
  })
  @ApiResponse({ status: 201, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or invoice not found' })
  handlePaymeWebhook(@Body() body: BillingWebhookDto) {
    return this.billingService.handleWebhook(BillingProvider.PAYME, body);
  }

  @Post('webhook/click')
  @ApiOperation({
    summary: 'Click webhook callback',
    description: 'Handles payment status updates from Click provider. Verifies HMAC signature.',
  })
  @ApiResponse({ status: 201, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or invoice not found' })
  handleClickWebhook(@Body() body: BillingWebhookDto) {
    return this.billingService.handleWebhook(BillingProvider.CLICK, body);
  }

  @Patch('subscription-status')
  @UseGuards(DeveloperAuthGuard)
  @ApiOperation({
    summary: 'Update own project subscription status',
    description:
      'Developer can update subscription status for their own projects. ' +
      'Valid statuses: TRIAL, ACTIVE, PAST_DUE, CANCELED, EXPIRED. ' +
      'Requires developer authentication and project membership.',
  })
  @ApiBody({
    type: UpdateSubscriptionStatusDto,
    examples: {
      activate: {
        value: { projectId: 1, status: 'ACTIVE' },
        description: 'Activate subscription',
      },
      cancel: {
        value: { projectId: 1, status: 'CANCELED' },
        description: 'Cancel subscription',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription status updated successfully',
    schema: {
      example: {
        id: 1,
        projectId: 1,
        plan: 'PRO',
        status: 'ACTIVE',
        currentPeriodStart: '2026-04-29T00:00:00.000Z',
        currentPeriodEnd: '2026-05-29T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid status or project not found' })
  @ApiResponse({ status: 403, description: 'No access to this project workspace' })
  updateSubscriptionStatus(
    @Body() dto: UpdateSubscriptionStatusDto,
    @Req() request: Request & { developerId?: number },
  ) {
    return this.billingService.updateSubscriptionStatus(
      dto.projectId,
      dto.status,
      request.developerId,
    );
  }

  // ─── Admin Endpoints ───────────────────────────────────────────

  @Patch('admin/subscription-status')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: '[Admin] Update any project subscription status',
    description:
      'Admin-only endpoint to update subscription status for ANY project. ' +
      'No membership check — requires x-admin-key header. ' +
      'Valid statuses: TRIAL, ACTIVE, PAST_DUE, CANCELED, EXPIRED. ' +
      'Use this to manually activate/cancel subscriptions for developers.',
  })
  @ApiHeader({
    name: 'x-admin-key',
    description: 'Admin secret key (from ADMIN_SECRET env variable)',
    required: true,
    example: 'your-admin-secret-key',
  })
  @ApiBody({
    type: UpdateSubscriptionStatusDto,
    examples: {
      activate: {
        value: { projectId: 1, status: 'ACTIVE' },
        description: 'Activate subscription for any project',
      },
      trial: {
        value: { projectId: 1, status: 'TRIAL' },
        description: 'Reset to trial period',
      },
      pastdue: {
        value: { projectId: 1, status: 'PAST_DUE' },
        description: 'Mark as past due',
      },
      cancel: {
        value: { projectId: 1, status: 'CANCELED' },
        description: 'Cancel subscription',
      },
      expire: {
        value: { projectId: 1, status: 'EXPIRED' },
        description: 'Mark as expired',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription status updated successfully. Notification sent to developer.',
    schema: {
      example: {
        id: 1,
        projectId: 1,
        plan: 'PRO',
        status: 'ACTIVE',
        provider: null,
        externalRef: null,
        currentPeriodStart: '2026-04-29T00:00:00.000Z',
        currentPeriodEnd: '2026-05-29T00:00:00.000Z',
        project: { id: 1, name: 'My Project', developerId: 1 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid status or project not found' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin key' })
  adminUpdateSubscriptionStatus(
    @Body() dto: UpdateSubscriptionStatusDto,
  ) {
    return this.billingService.adminUpdateSubscriptionStatus(
      dto.projectId,
      dto.status,
    );
  }

  @Post('admin/confirm-payment')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: '[Admin] Confirm manual payment and activate subscription',
    description:
      'Admin confirms a pending invoice as paid. This will: ' +
      '1) Update invoice status to PAID, ' +
      '2) Activate subscription with the plan from the invoice, ' +
      '3) Send notification to the developer. ' +
      'Use this after verifying the developer has paid via card transfer or cash.',
  })
  @ApiHeader({
    name: 'x-admin-key',
    description: 'Admin secret key (from ADMIN_SECRET env variable)',
    required: true,
  })
  @ApiBody({
    type: AdminConfirmPaymentDto,
    examples: {
      confirm: {
        value: { invoiceId: 1 },
        description: 'Confirm payment for invoice #1',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Payment confirmed and subscription activated',
    schema: {
      example: {
        ok: true,
        message: 'Invoice #1 confirmed. Subscription activated with plan PRO.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invoice not found or has no plan' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin key' })
  adminConfirmPayment(@Body() dto: AdminConfirmPaymentDto) {
    return this.billingService.adminConfirmPayment(dto.invoiceId);
  }

  @Get('admin/invoices')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: '[Admin] List all invoices',
    description:
      'Returns all billing invoices with project and developer details. ' +
      'Sorted by creation date (newest first). ' +
      'Use this to review pending payments and confirm them.',
  })
  @ApiHeader({
    name: 'x-admin-key',
    description: 'Admin secret key',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'List of all invoices',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin key' })
  adminListInvoices() {
    return this.billingService.adminListInvoices();
  }

  @Get('admin/subscriptions')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: '[Admin] List all subscriptions',
    description:
      'Returns all project subscriptions with project and developer details. ' +
      'Sorted by last update (newest first). ' +
      'Use this to see current status of all developer subscriptions.',
  })
  @ApiHeader({
    name: 'x-admin-key',
    description: 'Admin secret key',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'List of all subscriptions',
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin key' })
  adminListSubscriptions() {
    return this.billingService.adminListSubscriptions();
  }
}
