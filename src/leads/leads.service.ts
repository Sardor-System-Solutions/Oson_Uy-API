import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../common/services/notifications.service';
import { TelegramBotService } from '../telegram/telegram-bot.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { FilterLeadDto } from './dto/filter-lead.dto';

function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHref(url: string): string {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private telegramBot: TelegramBotService,
  ) {}

  async create(createLeadDto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({
      data: createLeadDto,
      include: {
        apartment: {
          include: {
            project: { include: { developer: true } },
          },
        },
        project: { include: { developer: true } },
      },
    });

    // Send notification about new lead
    await this.notificationsService.notifyNewLead(
      lead.name,
      lead.apartmentId,
      lead.project?.name ??
        lead.apartment?.project?.name ??
        'Unknown project',
    );

    const projectName =
      lead.project?.name ?? lead.apartment?.project?.name ?? '—';
    const developer =
      lead.project?.developer ?? lead.apartment?.project?.developer;

    if (developer?.telegramChatId) {
      const dashboardBase =
        process.env.DASHBOARD_PUBLIC_URL ??
        process.env.FRONTEND_URL ??
        'http://localhost:3000';
      const leadsUrl = `${dashboardBase.replace(/\/$/, '')}/dashboard/leads`;
      const when = new Date(lead.createdAt).toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      const apartmentHint =
        lead.apartmentId != null
          ? `\n🚪 <b>Квартира (id):</b> <code>${lead.apartmentId}</code>`
          : '';
      const html = [
        '🎯 <b>Новая заявка</b> · <i>OsonUy</i>',
        '',
        '👤 <b>Имя:</b> ' + escapeTelegramHtml(lead.name),
        '📞 <b>Телефон:</b> <code>' +
          escapeTelegramHtml(lead.phone) +
          '</code>',
        '🏗 <b>Объект:</b> ' + escapeTelegramHtml(projectName),
        '🆔 <b>№ заявки:</b> <code>' + String(lead.id) + '</code>',
        '🕐 <b>Когда:</b> ' + escapeTelegramHtml(when),
        apartmentHint,
        '',
        '✅ Статус и ссылка на отзыв — в кабинете.',
        '👉 <a href="' + escapeHref(leadsUrl) + '">Открыть раздел «Заявки»</a>',
      ]
        .filter(Boolean)
        .join('\n');
      await this.telegramBot.sendHtml(developer.telegramChatId, html);
    }

    return lead;
  }

  async findAll(filters?: FilterLeadDto, developerId?: number) {
    const where: Prisma.LeadWhereInput = {};

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (developerId) {
      where.project = { developerId };
    }

    return this.prisma.lead.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        apartment: {
          include: {
            project: true,
          },
        },
        project: true,
        feedback: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number, developerId?: number) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        apartment: {
          include: {
            project: true,
          },
        },
        project: true,
        feedback: true,
      },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    if (
      developerId &&
      lead.project &&
      lead.project.developerId !== developerId
    ) {
      throw new ForbiddenException('No access to this lead');
    }
    return lead;
  }

  async update(id: number, updateLeadDto: UpdateLeadDto, developerId?: number) {
    if (developerId) {
      await this.findOne(id, developerId);
    }
    const lead = await this.prisma.lead.update({
      where: { id },
      data: updateLeadDto,
      include: {
        apartment: {
          include: {
            project: true,
          },
        },
        project: true,
        feedback: true,
      },
    });

    // Send notification about status change
    if (updateLeadDto.status) {
      await this.notificationsService.notifyLeadStatusChange(
        lead.name,
        updateLeadDto.status,
        lead.project?.name ?? 'Unknown project',
      );
    }

    return lead;
  }

  async createFeedbackRequest(leadId: number, developerId?: number) {
    const lead = await this.findOne(leadId, developerId);

    const token = randomUUID();
    const feedback = await this.prisma.leadFeedback.upsert({
      where: { leadId },
      update: {
        token,
      },
      create: {
        leadId,
        token,
      },
    });

    return {
      leadId,
      token: feedback.token,
      feedbackUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/feedback/${feedback.token}`,
    };
  }

  async submitFeedback(
    token: string,
    payload: { rating: number; comment?: string },
  ) {
    try {
      return await this.prisma.leadFeedback.update({
        where: { token },
        data: {
          rating: payload.rating,
          comment: payload.comment,
          submittedAt: new Date(),
        },
        include: {
          lead: {
            include: {
              project: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Feedback link is invalid or expired');
      }
      throw error;
    }
  }

  async getFeedbackSummary(developerId?: number) {
    const feedbacks = await this.prisma.leadFeedback.findMany({
      where: {
        submittedAt: { not: null },
        ...(developerId
          ? {
              lead: {
                project: {
                  developerId,
                },
              },
            }
          : {}),
      },
      include: {
        lead: {
          include: {
            project: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    const avgRating = feedbacks.length
      ? Number(
          (
            feedbacks.reduce((sum, item) => sum + (item.rating ?? 0), 0) /
            feedbacks.length
          ).toFixed(1),
        )
      : null;

    return {
      avgRating,
      totalFeedbacks: feedbacks.length,
      items: feedbacks,
    };
  }
}
