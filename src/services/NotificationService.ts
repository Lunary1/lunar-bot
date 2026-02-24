import { supabase } from "@/app/lib/supabaseClient";

export interface NotificationConfig {
  email: boolean;
  discord: boolean;
  telegram: boolean;
  push: boolean;
}

export interface NotificationData {
  userId: string;
  type:
    | "stock_alert"
    | "price_alert"
    | "auto_purchase"
    | "task_completed"
    | "task_failed";
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  private emailService: any;
  private discordWebhookUrl: string | null = null;
  private telegramBotToken: string | null = null;

  constructor() {
    this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || null;
    this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || null;
  }

  /**
   * Send notification to user based on their preferences
   */
  async sendNotification(notificationData: NotificationData): Promise<void> {
    try {
      // Get user notification preferences
      const { data: userPrefs } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", notificationData.userId)
        .single();

      const config: NotificationConfig = userPrefs || {
        email: true,
        discord: false,
        telegram: false,
        push: false,
      };

      // Send notifications based on user preferences
      const promises: Promise<void>[] = [];

      if (config.email) {
        promises.push(this.sendEmailNotification(notificationData));
      }

      if (config.discord && this.discordWebhookUrl) {
        promises.push(this.sendDiscordNotification(notificationData));
      }

      if (config.telegram && this.telegramBotToken) {
        promises.push(this.sendTelegramNotification(notificationData));
      }

      if (config.push) {
        promises.push(this.sendPushNotification(notificationData));
      }

      // Execute all notifications in parallel
      await Promise.allSettled(promises);

      // Log notification in database
      await this.logNotification(notificationData);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    notificationData: NotificationData
  ): Promise<void> {
    try {
      // Get user email
      const { data: user } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", notificationData.userId)
        .single();

      if (!user?.email) {
        console.log("No email found for user:", notificationData.userId);
        return;
      }

      // In production, integrate with email service (SendGrid, AWS SES, etc.)
      console.log(
        `📧 Email notification sent to ${user.email}: ${notificationData.title}`
      );

      // Example email service integration:
      // await this.emailService.send({
      //   to: user.email,
      //   subject: notificationData.title,
      //   html: this.generateEmailTemplate(notificationData),
      // });
    } catch (error) {
      console.error("Error sending email notification:", error);
    }
  }

  /**
   * Send Discord webhook notification
   */
  private async sendDiscordNotification(
    notificationData: NotificationData
  ): Promise<void> {
    try {
      if (!this.discordWebhookUrl) return;

      const embed = {
        title: notificationData.title,
        description: notificationData.message,
        color: this.getNotificationColor(notificationData.type),
        timestamp: new Date().toISOString(),
        fields: [],
      };

      // Add additional data as fields
      if (notificationData.data) {
        Object.entries(notificationData.data).forEach(([key, value]) => {
          embed.fields.push({
            name: key,
            value: String(value),
            inline: true,
          });
        });
      }

      const response = await fetch(this.discordWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.statusText}`);
      }

      console.log(`📱 Discord notification sent: ${notificationData.title}`);
    } catch (error) {
      console.error("Error sending Discord notification:", error);
    }
  }

  /**
   * Send Telegram notification
   */
  private async sendTelegramNotification(
    notificationData: NotificationData
  ): Promise<void> {
    try {
      if (!this.telegramBotToken) return;

      // Get user's Telegram chat ID
      const { data: userPrefs } = await supabase
        .from("user_notifications")
        .select("telegram_chat_id")
        .eq("user_id", notificationData.userId)
        .single();

      if (!userPrefs?.telegram_chat_id) {
        console.log(
          "No Telegram chat ID found for user:",
          notificationData.userId
        );
        return;
      }

      const message = `*${notificationData.title}*\n\n${notificationData.message}`;

      const response = await fetch(
        `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: userPrefs.telegram_chat_id,
            text: message,
            parse_mode: "Markdown",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Telegram API failed: ${response.statusText}`);
      }

      console.log(`📱 Telegram notification sent: ${notificationData.title}`);
    } catch (error) {
      console.error("Error sending Telegram notification:", error);
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    notificationData: NotificationData
  ): Promise<void> {
    try {
      // Get user's push notification tokens
      const { data: tokens } = await supabase
        .from("user_push_tokens")
        .select("token")
        .eq("user_id", notificationData.userId)
        .eq("is_active", true);

      if (!tokens || tokens.length === 0) {
        console.log("No push tokens found for user:", notificationData.userId);
        return;
      }

      // In production, integrate with push notification service (FCM, APNs, etc.)
      console.log(
        `📱 Push notification sent to ${tokens.length} devices: ${notificationData.title}`
      );

      // Example push notification service integration:
      // await this.pushService.send({
      //   tokens: tokens.map(t => t.token),
      //   title: notificationData.title,
      //   body: notificationData.message,
      //   data: notificationData.data,
      // });
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }

  /**
   * Log notification in database
   */
  private async logNotification(
    notificationData: NotificationData
  ): Promise<void> {
    try {
      await supabase.from("notification_logs").insert({
        user_id: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error logging notification:", error);
    }
  }

  /**
   * Get notification color for Discord embeds
   */
  private getNotificationColor(type: string): number {
    switch (type) {
      case "stock_alert":
        return 0x00ff00; // Green
      case "price_alert":
        return 0xffaa00; // Orange
      case "auto_purchase":
        return 0x0099ff; // Blue
      case "task_completed":
        return 0x00ff00; // Green
      case "task_failed":
        return 0xff0000; // Red
      default:
        return 0x808080; // Gray
    }
  }

  /**
   * Generate email template
   */
  private generateEmailTemplate(notificationData: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${notificationData.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${notificationData.title}</h2>
          <p style="color: #666;">${notificationData.message}</p>
          ${
            notificationData.data
              ? `
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <h3 style="margin-top: 0;">Details:</h3>
              ${Object.entries(notificationData.data)
                .map(
                  ([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`
                )
                .join("")}
            </div>
          `
              : ""
          }
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from LunarBot. 
            You can manage your notification preferences in your account settings.
          </p>
        </body>
      </html>
    `;
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    notifications: NotificationData[]
  ): Promise<void> {
    const promises = notifications.map((notification) =>
      this.sendNotification(notification)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: string): Promise<any> {
    try {
      const { data: stats } = await supabase
        .from("notification_logs")
        .select("type, sent_at")
        .eq("user_id", userId)
        .gte(
          "sent_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        ); // Last 30 days

      if (!stats) return null;

      const typeCounts = stats.reduce((acc, log) => {
        acc[log.type] = (acc[log.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total: stats.length,
        byType: typeCounts,
        lastNotification: stats[stats.length - 1]?.sent_at,
      };
    } catch (error) {
      console.error("Error getting notification stats:", error);
      return null;
    }
  }
}
