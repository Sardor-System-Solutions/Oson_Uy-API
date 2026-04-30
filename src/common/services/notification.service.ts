import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface NotificationPayload {
  type: 'PAYMENT_REQUEST' | 'SUBSCRIPTION_STATUS_CHANGE' | 'LEAD_RECEIVED';
  developerId?: number;
  developerName?: string;
  developerEmail?: string;
  developerPhone?: string;
  projectName?: string;
  projectId?: number;
  amount?: number;
  plan?: string;
  status?: string;
  message?: string;
  requestId?: string;
  leadName?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly telegramBotToken: string;
  private readonly telegramChannelId: string;

  constructor(private configService: ConfigService) {
    this.telegramBotToken = this.configService.get('TELEGRAM_BOT_TOKEN') || '';
    this.telegramChannelId =
      this.configService.get('TELEGRAM_CHANNEL_ID') || '';
  }

  async notifyDeveloper(payload: NotificationPayload): Promise<void> {
    try {
      if (payload.type === 'PAYMENT_REQUEST') {
        await this.notifyPaymentRequest(payload);
      } else if (payload.type === 'SUBSCRIPTION_STATUS_CHANGE') {
        await this.notifySubscriptionStatusChange(payload);
      } else if (payload.type === 'LEAD_RECEIVED') {
        await this.notifyLeadReceived(payload);
      }
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error}`);
      // Don't throw - notifications should not block main flow
    }
  }

  private async notifyPaymentRequest(
    payload: NotificationPayload,
  ): Promise<void> {
    const message = `
📋 **Новая заявка на оплату**

👤 Разработчик: ${payload.developerName}
🏢 Проект: ${payload.projectName}
📊 План: ${payload.plan}
💰 Сумма: ${payload.amount?.toLocaleString('uz-UZ')} сум
📝 Статус: Ожидает оплаты
🔑 ID заявки: ${payload.requestId}

💬 Сообщение: ${payload.message || 'Нет'}

⏰ Время: ${new Date().toLocaleString('uz-UZ')}
`;

    await this.sendTelegramNotification(message);

    // Email notification would go here
    if (payload.developerEmail) {
      await this.sendEmailNotification(
        payload.developerEmail,
        'Новая заявка на оплату',
        message,
      );
    }
  }

  private async notifySubscriptionStatusChange(
    payload: NotificationPayload,
  ): Promise<void> {
    const statusLabels: Record<string, string> = {
      TRIAL: '🟡 Пробный период',
      ACTIVE: '✅ Активна',
      PAST_DUE: '⚠️ Просрочена',
      CANCELED: '❌ Отменена',
      EXPIRED: '⏰ Истекла',
    };

    const message = `
🔔 **Изменение статуса подписки**

👤 Разработчик: ${payload.developerName}
🏢 Проект: ${payload.projectName}
📊 План: ${payload.plan}
📌 Новый статус: ${statusLabels[payload.status || 'ACTIVE']}

⏰ Время: ${new Date().toLocaleString('uz-UZ')}
`;

    await this.sendTelegramNotification(message);

    if (payload.developerEmail) {
      await this.sendEmailNotification(
        payload.developerEmail,
        'Изменение статуса подписки',
        message,
      );
    }
  }

  private async notifyLeadReceived(
    payload: NotificationPayload,
  ): Promise<void> {
    const message = `
👥 **Новая заявка от клиента**

👤 Имя: ${payload.leadName}
🏢 Проект: ${payload.projectName}
📱 Сообщение: ${payload.message}

⏰ Время: ${new Date().toLocaleString('uz-UZ')}
`;

    await this.sendTelegramNotification(message);

    if (payload.developerEmail) {
      await this.sendEmailNotification(
        payload.developerEmail,
        'Новая заявка от клиента',
        message,
      );
    }
  }

  private async sendTelegramNotification(message: string): Promise<void> {
    if (!this.telegramBotToken || !this.telegramChannelId) {
      this.logger.warn('Telegram credentials not configured');
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.telegramChannelId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.statusText}`);
      }
    } catch (error) {
      this.logger.error(`Telegram notification failed: ${error}`);
    }
  }

  private async sendEmailNotification(
    to: string,
    subject: string,
    body: string,
  ): Promise<void> {
    // Email integration would be implemented here
    // Could use Nodemailer, SendGrid, etc.
    this.logger.debug(`Email notification would be sent to ${to}: ${subject}`);
  }
}
