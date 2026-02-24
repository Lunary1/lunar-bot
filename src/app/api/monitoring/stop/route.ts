import { NextRequest, NextResponse } from "next/server";
import { ProductMonitor } from "@/services/ProductMonitor";
import { Redis } from "ioredis";

// Redis connection
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Global monitoring instance (shared with start route)
let globalMonitor: ProductMonitor | null = null;

export async function POST(request: NextRequest) {
  try {
    // If no monitoring instance exists, return error
    if (!globalMonitor) {
      return NextResponse.json({
        success: false,
        message: "Monitoring service is not running",
      });
    }

    // Stop monitoring
    await globalMonitor.stopMonitoring();
    globalMonitor = null;

    return NextResponse.json({
      success: true,
      message: "Monitoring service stopped successfully",
    });
  } catch (error) {
    console.error("Stop monitoring error:", error);
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
        message: "Monitoring service not running",
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
