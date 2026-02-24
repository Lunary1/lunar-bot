import { NextRequest, NextResponse } from "next/server";
import { getWorkerManager } from "@/workers/WorkerManager";

export async function GET(request: NextRequest) {
  try {
    const workerManager = getWorkerManager();
    const healthCheck = await workerManager.healthCheck();
    const metrics = await workerManager.getMetrics();
    const status = workerManager.getStatus();

    return NextResponse.json({
      success: true,
      data: {
        health: healthCheck,
        metrics,
        status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Health check failed",
        data: {
          health: { healthy: false, services: {} },
          metrics: null,
          status: { isRunning: false, services: {} },
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
