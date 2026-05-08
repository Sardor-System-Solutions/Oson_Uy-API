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
import { NotificationService } from '../common/services/notification.service';
import { ManualPaymentMethod } from './dto/create-checkout.dto';

const PLAN_PRICES_UZS: Record<SubscriptionPlan, number> = {
  START: 1000000,
  PRO: 3000000,
  PREMIUM: 4000000,
  ULTIMATE: 5000000,
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

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

    // Send notification to developer
    const developer = await this.prisma.developer.findUnique({
      where: { id: project.developerId },
    });

    if (developer) {
      void this.notificationService.notifyDeveloper({
        type: 'PAYMENT_REQUEST',
        developerId: project.developerId,
        developerName: developer.name,
        developerEmail: developer.email,
        projectName: project.name,
        projectId,
        plan,
        amount: amountUzs,
        requestId: externalRef,
        message: note,
      });
    }

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

  async updateSubscriptionStatus(
    projectId: number,
    status: string,
    developerId?: number,
  ) {
    // Validate status
    const validStatuses = Object.values(SubscriptionStatus);
    if (!validStatuses.includes(status as SubscriptionStatus)) {
      throw new BadRequestException(
        `Invalid subscription status. Valid options: ${validStatuses.join(', ')}`,
      );
    }

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

    const subscription = await this.prisma.projectSubscription.upsert({
      where: { projectId },
      update: { status: status as SubscriptionStatus },
      create: {
        projectId,
        status: status as SubscriptionStatus,
        plan: SubscriptionPlan.START,
      },
      include: { project: true },
    });

    // Send notification to developer
    const developer = await this.prisma.developer.findUnique({
      where: { id: project.developerId },
    });

    if (developer) {
      void this.notificationService.notifyDeveloper({
        type: 'SUBSCRIPTION_STATUS_CHANGE',
        developerId: project.developerId,
        developerName: developer.name,
        developerEmail: developer.email,
        projectName: project.name,
        projectId,
        plan: subscription.plan,
        status: subscription.status,
      });
    }

    return subscription;
  }

  /** Admin-only: update any project subscription status without membership check */
  async adminUpdateSubscriptionStatus(
    projectId: number,
    status: string,
  ) {
    const validStatuses = Object.values(SubscriptionStatus);
    if (!validStatuses.includes(status as SubscriptionStatus)) {
      throw new BadRequestException(
        `Invalid subscription status. Valid options: ${validStatuses.join(', ')}`,
      );
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const subscription = await this.prisma.projectSubscription.upsert({
      where: { projectId },
      update: { status: status as SubscriptionStatus },
      create: {
        projectId,
        status: status as SubscriptionStatus,
        plan: SubscriptionPlan.START,
      },
      include: { project: true },
    });

    // Notify developer
    const developer = await this.prisma.developer.findUnique({
      where: { id: project.developerId },
    });
    if (developer) {
      void this.notificationService.notifyDeveloper({
        type: 'SUBSCRIPTION_STATUS_CHANGE',
        developerId: project.developerId,
        developerName: developer.name,
        developerEmail: developer.email,
        projectName: project.name,
        projectId,
        plan: subscription.plan,
        status: subscription.status,
      });
    }

    return subscription;
  }

  /** Admin-only: update plan/status and period end */
  async adminUpdateSubscription(input: {
    projectId: number;
    status?: SubscriptionStatus;
    plan?: SubscriptionPlan;
    currentPeriodEnd?: string;
    extendDays?: number;
  }) {
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
    });
    if (!project) throw new BadRequestException('Project not found');

    const cur = await this.prisma.projectSubscription.findUnique({
      where: { projectId: input.projectId },
    });
    const now = new Date();
    const baseEnd = cur?.currentPeriodEnd ?? cur?.trialEndsAt ?? now;
    const extended =
      input.extendDays && input.extendDays > 0
        ? new Date(Math.max(baseEnd.getTime(), now.getTime()) + input.extendDays * 24 * 60 * 60 * 1000)
        : null;
    const explicitEnd = input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : null;
    const nextEnd = explicitEnd ?? extended ?? cur?.currentPeriodEnd ?? null;

    const subscription = await this.prisma.projectSubscription.upsert({
      where: { projectId: input.projectId },
      update: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.plan ? { plan: input.plan } : {}),
        ...(nextEnd ? { currentPeriodEnd: nextEnd } : {}),
        ...(input.status === SubscriptionStatus.TRIAL
          ? { trialStartsAt: now, trialEndsAt: nextEnd ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }
          : {}),
      },
      create: {
        projectId: input.projectId,
        status: input.status ?? SubscriptionStatus.TRIAL,
        plan: input.plan ?? SubscriptionPlan.START,
        trialStartsAt: null,
        trialEndsAt: null,
        currentPeriodStart: input.status === SubscriptionStatus.ACTIVE ? now : null,
        currentPeriodEnd: nextEnd,
      },
      include: { project: true },
    });

    return subscription;
  }

  /** Admin-only: confirm a pending invoice as paid and activate subscription */
  async adminConfirmPayment(invoiceId: number) {
    const invoice = await this.prisma.billingInvoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }
    if (invoice.status === 'PAID') {
      return { ok: true, message: 'Invoice already paid' };
    }

    const plan = (invoice.metadata as { plan?: SubscriptionPlan })?.plan;
    if (!plan) {
      throw new BadRequestException('Invoice has no subscription plan');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.billingInvoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID' },
      });

      await tx.projectSubscription.upsert({
        where: { projectId: invoice.projectId },
        update: {
          plan,
          status: SubscriptionStatus.ACTIVE,
          provider: invoice.provider,
          externalRef: invoice.externalRef,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        create: {
          projectId: invoice.projectId,
          plan,
          status: SubscriptionStatus.ACTIVE,
          provider: invoice.provider,
          externalRef: invoice.externalRef,
          trialStartsAt: null,
          trialEndsAt: null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    });

    // Notify developer
    const project = await this.prisma.project.findUnique({
      where: { id: invoice.projectId },
    });
    if (project) {
      const developer = await this.prisma.developer.findUnique({
        where: { id: project.developerId },
      });
      if (developer) {
        void this.notificationService.notifyDeveloper({
          type: 'SUBSCRIPTION_STATUS_CHANGE',
          developerId: project.developerId,
          developerName: developer.name,
          developerEmail: developer.email,
          projectName: project.name,
          projectId: project.id,
          plan,
          status: 'ACTIVE',
        });
      }
    }

    return {
      ok: true,
      message: `Invoice #${invoiceId} confirmed. Subscription activated with plan ${plan}.`,
    };
  }

  /** Admin-only: list all invoices for review */
  async adminListInvoices() {
    const invoices = await this.prisma.billingInvoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          include: {
            developer: true,
            subscription: true,
          },
        },
      },
    });

    return invoices.map((inv) => ({
      ...inv,
      amountUzs: inv.amountUsd,
      plan: (inv.metadata as any)?.plan || 'START',
    }));
  }

  /** Admin-only: list all subscriptions */
  async adminListSubscriptions() {
    return this.prisma.projectSubscription.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        project: {
          include: { developer: true },
        },
      },
    });
  }
}
