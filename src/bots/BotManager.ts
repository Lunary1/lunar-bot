import { StoreBot } from "./base/StoreBot";
import { DreamlandBot } from "./dreamland/DreamlandBot";
import { BolComBot } from "./bol-com/BolComBot";
import { BotResult } from "./base/StoreBot";

export interface BotInstance {
  id: string;
  name: string;
  type: string;
  bot: StoreBot;
  status: "idle" | "running" | "error" | "stopped";
  lastActivity: Date | null;
  performance: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
  };
  config: {
    headless: boolean;
    timeout: number;
    retryAttempts: number;
    delayBetweenActions: number;
  };
}

export class BotManager {
  private bots: Map<string, BotInstance> = new Map();
  private activeTasks: Map<string, string> = new Map(); // taskId -> botId

  /**
   * Create a new bot instance
   */
  async createBot(
    type: string,
    config: any,
    proxy?: any,
  ): Promise<{ success: boolean; botId?: string; error?: string }> {
    try {
      const botId = this.generateBotId();
      let bot: StoreBot;

      // Create bot instance based on type
      switch (type) {
        case "dreamland":
          bot = new DreamlandBot(config, proxy);
          break;
        case "mediamarkt":
          // TODO: Implement MediamarktBot
          throw new Error("Mediamarkt bot not implemented yet");
        case "fnac":
          // TODO: Implement FnacBot
          throw new Error("Fnac bot not implemented yet");
        case "bol.com":
        case "bol":
          bot = new BolComBot(config, proxy);
          break;
        default:
          throw new Error(`Unknown bot type: ${type}`);
      }

      // Initialize the bot
      const initResult = await bot.initialize();
      if (!initResult.success) {
        throw new Error(initResult.error || "Failed to initialize bot");
      }

      // Create bot instance
      const botInstance: BotInstance = {
        id: botId,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Bot`,
        type,
        bot,
        status: "idle",
        lastActivity: null,
        performance: {
          totalTasks: 0,
          successfulTasks: 0,
          failedTasks: 0,
          averageExecutionTime: 0,
        },
        config,
      };

      this.bots.set(botId, botInstance);

      return {
        success: true,
        botId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get bot by ID
   */
  getBot(botId: string): BotInstance | undefined {
    return this.bots.get(botId);
  }

  /**
   * Get all bots
   */
  getAllBots(): BotInstance[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get bots by type
   */
  getBotsByType(type: string): BotInstance[] {
    return Array.from(this.bots.values()).filter((bot) => bot.type === type);
  }

  /**
   * Get available bots (idle status)
   */
  getAvailableBots(): BotInstance[] {
    return Array.from(this.bots.values()).filter(
      (bot) => bot.status === "idle",
    );
  }

  /**
   * Start a bot
   */
  async startBot(botId: string): Promise<BotResult> {
    const botInstance = this.bots.get(botId);
    if (!botInstance) {
      return {
        success: false,
        message: "Bot not found",
      };
    }

    if (botInstance.status === "running") {
      return {
        success: false,
        message: "Bot is already running",
      };
    }

    try {
      botInstance.status = "running";
      botInstance.lastActivity = new Date();

      return {
        success: true,
        message: "Bot started successfully",
      };
    } catch (error) {
      botInstance.status = "error";
      return {
        success: false,
        message: "Failed to start bot",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Stop a bot
   */
  async stopBot(botId: string): Promise<BotResult> {
    const botInstance = this.bots.get(botId);
    if (!botInstance) {
      return {
        success: false,
        message: "Bot not found",
      };
    }

    try {
      await botInstance.bot.cleanup();
      botInstance.status = "stopped";
      botInstance.lastActivity = new Date();

      return {
        success: true,
        message: "Bot stopped successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to stop bot",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Remove a bot
   */
  async removeBot(botId: string): Promise<BotResult> {
    const botInstance = this.bots.get(botId);
    if (!botInstance) {
      return {
        success: false,
        message: "Bot not found",
      };
    }

    try {
      // Stop bot if running
      if (botInstance.status === "running") {
        await this.stopBot(botId);
      }

      // Clean up resources
      await botInstance.bot.cleanup();

      // Remove from active tasks
      for (const [taskId, activeBotId] of this.activeTasks.entries()) {
        if (activeBotId === botId) {
          this.activeTasks.delete(taskId);
        }
      }

      // Remove from bots map
      this.bots.delete(botId);

      return {
        success: true,
        message: "Bot removed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to remove bot",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Assign task to bot
   */
  async assignTask(taskId: string, botId: string): Promise<BotResult> {
    const botInstance = this.bots.get(botId);
    if (!botInstance) {
      return {
        success: false,
        message: "Bot not found",
      };
    }

    if (botInstance.status !== "idle") {
      return {
        success: false,
        message: "Bot is not available",
      };
    }

    try {
      this.activeTasks.set(taskId, botId);
      botInstance.status = "running";
      botInstance.lastActivity = new Date();

      return {
        success: true,
        message: "Task assigned to bot",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to assign task",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Complete task and free bot
   */
  async completeTask(taskId: string, success: boolean): Promise<BotResult> {
    const botId = this.activeTasks.get(taskId);
    if (!botId) {
      return {
        success: false,
        message: "Task not found",
      };
    }

    const botInstance = this.bots.get(botId);
    if (!botInstance) {
      return {
        success: false,
        message: "Bot not found",
      };
    }

    try {
      // Update performance metrics
      botInstance.performance.totalTasks++;
      if (success) {
        botInstance.performance.successfulTasks++;
      } else {
        botInstance.performance.failedTasks++;
      }

      // Free the bot
      this.activeTasks.delete(taskId);
      botInstance.status = "idle";
      botInstance.lastActivity = new Date();

      return {
        success: true,
        message: "Task completed",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to complete task",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get bot performance metrics
   */
  getBotPerformance(botId: string): any {
    const botInstance = this.bots.get(botId);
    if (!botInstance) {
      return null;
    }

    const { performance } = botInstance;
    const successRate =
      performance.totalTasks > 0
        ? (performance.successfulTasks / performance.totalTasks) * 100
        : 0;

    return {
      ...performance,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round((100 - successRate) * 100) / 100,
    };
  }

  /**
   * Get overall system metrics
   */
  getSystemMetrics(): any {
    const allBots = Array.from(this.bots.values());
    const totalTasks = allBots.reduce(
      (sum, bot) => sum + bot.performance.totalTasks,
      0,
    );
    const successfulTasks = allBots.reduce(
      (sum, bot) => sum + bot.performance.successfulTasks,
      0,
    );
    const failedTasks = allBots.reduce(
      (sum, bot) => sum + bot.performance.failedTasks,
      0,
    );
    const runningBots = allBots.filter(
      (bot) => bot.status === "running",
    ).length;
    const idleBots = allBots.filter((bot) => bot.status === "idle").length;
    const errorBots = allBots.filter((bot) => bot.status === "error").length;

    return {
      totalBots: allBots.length,
      runningBots,
      idleBots,
      errorBots,
      totalTasks,
      successfulTasks,
      failedTasks,
      overallSuccessRate:
        totalTasks > 0
          ? Math.round((successfulTasks / totalTasks) * 10000) / 100
          : 0,
    };
  }

  /**
   * Health check for all bots
   */
  async healthCheck(): Promise<{
    healthy: number;
    unhealthy: number;
    details: any[];
  }> {
    const results = await Promise.all(
      Array.from(this.bots.values()).map(async (botInstance) => {
        try {
          const status = botInstance.bot.getStatus();
          const isHealthy =
            status.isRunning &&
            (botInstance.lastActivity
              ? Date.now() - botInstance.lastActivity.getTime() < 300000 // 5 minutes
              : false);

          return {
            botId: botInstance.id,
            name: botInstance.name,
            type: botInstance.type,
            healthy: isHealthy,
            lastActivity: botInstance.lastActivity,
            status: botInstance.status,
          };
        } catch (error) {
          return {
            botId: botInstance.id,
            name: botInstance.name,
            type: botInstance.type,
            healthy: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
    );

    const healthy = results.filter((r) => r.healthy).length;
    const unhealthy = results.filter((r) => !r.healthy).length;

    return {
      healthy,
      unhealthy,
      details: results,
    };
  }

  /**
   * Generate unique bot ID
   */
  private generateBotId(): string {
    return `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
