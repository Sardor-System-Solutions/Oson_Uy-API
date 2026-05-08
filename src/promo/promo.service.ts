import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PromoBenefitType, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PromoService {
  constructor(private readonly prisma: PrismaService) {}

  private now() {
    return new Date();
  }

  async redeem(codeRaw: string, projectId: number, developerId?: number) {
    const code = String(codeRaw ?? '').trim().toUpperCase();
    if (!code) throw new BadRequestException('Invalid promo code');

    const project = await this.prisma.project.findUnique({ where: { id: projectId }, include: { subscription: true } });
    if (!project) throw new BadRequestException('Project not found');
    if (developerId && project.developerId !== developerId) {
      const membership = await this.prisma.projectMember.findFirst({ where: { projectId, developerId } });
      if (!membership) throw new ForbiddenException('No access to this project workspace');
    }

    const promo = await this.prisma.promoCode.findUnique({
      where: { code },
      include: { redemptions: developerId ? { where: { developerId, projectId } } : false },
    });
    if (!promo || !promo.active) throw new BadRequestException('Promo code not found');

    const now = this.now();
    if (promo.startsAt && now < promo.startsAt) throw new BadRequestException('Promo code is not active yet');
    if (promo.expiresAt && now > promo.expiresAt) throw new BadRequestException('Promo code has expired');
    if (promo.maxRedemptions != null && promo.redeemedCount >= promo.maxRedemptions) {
      throw new BadRequestException('Promo code limit reached');
    }
    if (developerId && promo.redemptions.length > 0) {
      throw new BadRequestException('Promo code already redeemed');
    }

    if (promo.benefitType === PromoBenefitType.PERCENT_OFF) {
      // We keep percent-off for future integration with providers.
      throw new BadRequestException('Percent-off promo is not supported yet');
    }

    const freeDays = promo.freeDays ?? 0;
    if (!freeDays || freeDays <= 0) throw new BadRequestException('Invalid promo benefit');

    const targetPlan = promo.plan ?? project.subscription?.plan ?? SubscriptionPlan.START;

    const baseEnd =
      project.subscription?.currentPeriodEnd ??
      project.subscription?.trialEndsAt ??
      now;
    const nextEnd = new Date(Math.max(baseEnd.getTime(), now.getTime()) + freeDays * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.projectSubscription.upsert({
        where: { projectId },
        update: {
          plan: targetPlan,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: project.subscription?.currentPeriodStart ?? now,
          currentPeriodEnd: nextEnd,
          trialStartsAt: null,
          trialEndsAt: null,
          provider: null,
          externalRef: null,
        },
        create: {
          projectId,
          plan: targetPlan,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: nextEnd,
          trialStartsAt: null,
          trialEndsAt: null,
          provider: null,
          externalRef: null,
        },
      });

      await tx.promoRedemption.create({
        data: {
          promoCodeId: promo.id,
          developerId: developerId ?? null,
          projectId,
        },
      });

      await tx.promoCode.update({
        where: { id: promo.id },
        data: { redeemedCount: { increment: 1 } },
      });

      return sub;
    });

    return {
      ok: true,
      code: promo.code,
      plan: updated.plan,
      status: updated.status,
      currentPeriodEnd: updated.currentPeriodEnd,
      freeDays,
    };
  }

  // ─── Admin ────────────────────────────────────────────────────────────────
  adminList() {
    return this.prisma.promoCode.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  adminCreate(input: {
    code: string;
    description?: string;
    benefitType: PromoBenefitType;
    freeDays?: number;
    percentOff?: number;
    plan?: SubscriptionPlan;
    startsAt?: Date;
    expiresAt?: Date;
    maxRedemptions?: number;
    active?: boolean;
  }) {
    return this.prisma.promoCode.create({
      data: {
        code: input.code.trim().toUpperCase(),
        description: input.description?.trim() || null,
        benefitType: input.benefitType,
        freeDays: input.freeDays ?? null,
        percentOff: input.percentOff ?? null,
        plan: input.plan ?? null,
        startsAt: input.startsAt ?? null,
        expiresAt: input.expiresAt ?? null,
        maxRedemptions: input.maxRedemptions ?? null,
        active: input.active ?? true,
      },
    });
  }

  adminSetActive(id: number, active: boolean) {
    return this.prisma.promoCode.update({
      where: { id },
      data: { active },
    });
  }
}

