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

const PLAN_PRICES_USD: Record<SubscriptionPlan, number> = {
  START: 149,
  PRO: 249,
  PREMIUM: 399,
  ULTIMATE: 500,
};

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async createCheckout(
    projectId: number,
    plan: SubscriptionPlan,
    provider: BillingProvider,
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
    const amountUsd = PLAN_PRICES_USD[plan];
    const invoice = await this.prisma.billingInvoice.create({
      data: {
        projectId,
        provider,
        amountUsd,
        externalRef,
        checkoutUrl: `https://pay.example/checkout/${provider.toLowerCase()}/${externalRef}`,
        metadata: { plan },
      },
    });

    return {
      invoiceId: invoice.id,
      externalRef,
      amountUsd,
      checkoutUrl: invoice.checkoutUrl,
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
