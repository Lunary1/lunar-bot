import { NextRequest, NextResponse } from "next/server";
import { TaskExecutor } from "@/workers/TaskExecutor";

export async function POST(request: NextRequest) {
  try {
    const { productId, url, storeId } = await request.json();

    if (!productId || !url || !storeId) {
      return NextResponse.json(
        {
          error: "productId, url, and storeId are required",
        },
        { status: 400 }
      );
    }

    // Queue the scraping job
    const taskExecutor = new TaskExecutor();
    const job = await taskExecutor.queueScrapingJob({
      productId,
      url,
      storeId,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: "Product scraping job queued successfully",
    });
  } catch (error) {
    console.error("Error queuing scraping job:", error);
    return NextResponse.json(
      { error: "Failed to queue scraping job" },
      { status: 500 }
    );
  }
}
