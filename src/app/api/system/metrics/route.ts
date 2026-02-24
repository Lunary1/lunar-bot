import { NextRequest, NextResponse } from "next/server";
import { getWorkerManager } from "@/workers/WorkerManager";

export async function GET(request: NextRequest) {
  try {
    const workerManager = getWorkerManager();
    const metrics = await workerManager.getMetrics();
    const status = workerManager.getStatus();

    // Get additional system metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
    };

    // Get Redis metrics
    const redis = workerManager.getRedis();
    let redisMetrics = null;
    try {
      const info = await redis.info();
      const memoryInfo = await redis.info("memory");
      const statsInfo = await redis.info("stats");

      redisMetrics = {
        connectedClients: info.match(/connected_clients:(\d+)/)?.[1] || "0",
        usedMemory: memoryInfo.match(/used_memory:(\d+)/)?.[1] || "0",
        usedMemoryHuman:
          memoryInfo.match(/used_memory_human:([^\r\n]+)/)?.[1] || "0B",
        totalConnectionsReceived:
          statsInfo.match(/total_connections_received:(\d+)/)?.[1] || "0",
        totalCommandsProcessed:
          statsInfo.match(/total_commands_processed:(\d+)/)?.[1] || "0",
      };
    } catch (error) {
      console.error("Error getting Redis metrics:", error);
    }

    return NextResponse.json({
      success: true,
      data: {
        system: systemMetrics,
        redis: redisMetrics,
        worker: metrics,
        status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Metrics error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get metrics",
        data: null,
      },
      { status: 500 }
    );
  }
}
