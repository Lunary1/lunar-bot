import { NextRequest, NextResponse } from "next/server";
import { ProductMonitor } from "@/services/ProductMonitor";
import { Redis } from "ioredis";

// Redis connection
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Global monitoring instance
let globalMonitor: ProductMonitor | null = null;

export async function POST(request: NextRequest) {
  try {
    const { config } = await request.json();

    // If monitoring is already running, return status
    if (globalMonitor && globalMonitor.getStatus().isRunning) {
      return NextResponse.json({
        success: true,
        message: "Monitoring service is already running",
        status: globalMonitor.getStatus(),
      });
    }

    // Create new monitoring instance
    globalMonitor = new ProductMonitor(redis, config);
    await globalMonitor.startMonitoring();

    return NextResponse.json({
      success: true,
      message: "Monitoring service started successfully",
      status: globalMonitor.getStatus(),
    });
  } catch (error) {
    console.error("Start monitoring error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!globalMonitor) {
      return NextResponse.json({
        success: false,
        message: "Monitoring service not initialized",
        status: { isRunning: false },
      });
    }

    return NextResponse.json({
      success: true,
      status: globalMonitor.getStatus(),
    });
  } catch (error) {
    console.error("Get monitoring status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
