import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  BillingProvider,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client';
import { createHmac, randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { ManualPaymentMethod } from './dto/create-checkout.dto';

const PLAN_PRICES_UZS: Record<SubscriptionPlan, number> = {
  START: 1900000,
  PRO: 3200000,
  PREMIUM: 5100000,
  ULTIMATE: 6400000,
};

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async createCheckout(
    projectId: number,
    plan: SubscriptionPlan,
    paymentMethod: ManualPaymentMethod = 'CARD_TRANSFER',
    note?: string,
    developerId?: number,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new BadRequestException('Project not found');
    }
    if (developerId) {
      const membership = await this.prisma.projectMember.findFirst({
        where: { projectId, developerId },
      });
      if (!membership) {
        throw new ForbiddenException('No access to this project workspace');
      }
    }

    const externalRef = randomUUID();
    const amountUzs = PLAN_PRICES_UZS[plan];
    const cardNumber = process.env.MANUAL_PAYMENT_CARD ?? '';
    const cardHolder = process.env.MANUAL_PAYMENT_CARD_HOLDER ?? '';
    const cashAddress = process.env.MANUAL_PAYMENT_CASH_ADDRESS ?? '';

    const invoice = await this.prisma.billingInvoice.create({
      data: {
        projectId,
        provider: BillingProvider.PAYME,
        amountUsd: amountUzs,
        externalRef,
        checkoutUrl: null,
        metadata: {
          plan,
          currency: 'UZS',
          paymentMethod,
          note: note?.trim() || null,
          manual: true,
        },
      },
    });

    return {
      invoiceId: invoice.id,
      externalRef,
      amountUzs,
      status: invoice.status,
      paymentMethod,
      instructions:
        paymentMethod === 'CARD_TRANSFER'
          ? {
              type: 'CARD_TRANSFER',
              cardNumber,
              cardHolder,
              comment: `Укажите в комментарии к переводу: ${externalRef}`,
            }
          : {
              type: 'CASH',
              address: cashAddress,
              comment: `Назовите менеджеру код оплаты: ${externalRef}`,
            },
      message:
        'Заявка на оплату создана. После подтверждения менеджером подписка будет активирована.',
    };
  }

  async handleWebhook(
    provider: BillingProvider,
    payload: {
      externalRef: string;
      status: 'PAID' | 'FAILED' | 'CANCELED';
      signature?: string;
    },
  ) {
    const secret = process.env.BILLING_WEBHOOK_SECRET || '';
    if (!secret) {
      throw new BadRequestException('BILLING_WEBHOOK_SECRET is not configured');
    }
    const expected = createHmac('sha256', secret)
      .update(`${provider}:${payload.externalRef}:${payload.status}`)
      .digest('hex');
    if (payload.signature !== expected) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const invoice = await this.prisma.billingInvoice.findUnique({
      where: { externalRef: payload.externalRef },
    });
    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }
    if (invoice.provider !== provider) {
      throw new BadRequestException('Provider mismatch for invoice');
    }

    const eventKey = {
      provider,
      externalRef: payload.externalRef,
      status: payload.status,
    };

    const alreadyProcessed = await this.prisma.billingWebhookEvent.findFirst({
      where: eventKey,
    });
    if (alreadyProcessed) {
      return { ok: true, idempotent: true };
    }

    const newStatus =
      payload.status === 'PAID'
        ? 'PAID'
        : payload.status === 'FAILED'
          ? 'FAILED'
          : 'CANCELED';

    await this.prisma.$transaction(async (tx) => {
      await tx.billingWebhookEvent.create({
        data: {
          provider,
          externalRef: payload.externalRef,
          status: payload.status,
          signature: payload.signature,
        },
      });

      await tx.billingInvoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });

      if (payload.status === 'PAID') {
        const plan = (invoice.metadata as { plan?: SubscriptionPlan })?.plan;
        if (!plan) {
          throw new BadRequestException('Missing subscription plan');
        }
        await tx.projectSubscription.upsert({
          where: { projectId: invoice.projectId },
          update: {
            plan,
            status: SubscriptionStatus.ACTIVE,
            provider,
            externalRef: payload.externalRef,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          create: {
            projectId: invoice.projectId,
            plan,
            status: SubscriptionStatus.ACTIVE,
            provider,
            externalRef: payload.externalRef,
            trialStartsAt: null,
            trialEndsAt: null,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
    });

    return { ok: true };
  }
}
