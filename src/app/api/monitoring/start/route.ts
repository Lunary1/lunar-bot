import { NextRequest, NextResponse } from "next/server";
import { MonitoringService } from "@/services/MonitoringService";
import { Redis } from "ioredis";

// Redis connection
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export async function POST(request: NextRequest) {
  try {
    const { watchlistItemId } = await request.json();

    if (!watchlistItemId) {
      return NextResponse.json(
        { error: "Watchlist item ID is required" },
        { status: 400 }
      );
    }

    const monitoringService = new MonitoringService(redis);
    const result = await monitoringService.scheduleMonitoring(watchlistItemId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Start monitoring error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
