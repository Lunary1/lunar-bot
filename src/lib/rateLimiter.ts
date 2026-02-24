import { Redis } from "ioredis";
import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;

  constructor(redis: Redis, config: RateLimitConfig) {
    this.redis = redis;
    this.config = config;
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(request: NextRequest): Promise<RateLimitResult> {
    const key = this.generateKey(request);
    const window = Math.floor(Date.now() / this.config.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;

    try {
      // Get current count
      const current = await this.redis.get(redisKey);
      const count = current ? parseInt(current) : 0;

      if (count >= this.config.maxRequests) {
        // Rate limit exceeded
        const resetTime = (window + 1) * this.config.windowMs;
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

        return {
          success: false,
          limit: this.config.maxRequests,
          remaining: 0,
          resetTime,
          retryAfter,
        };
      }

      // Increment counter
      await this.redis.incr(redisKey);
      await this.redis.expire(redisKey, Math.ceil(this.config.windowMs / 1000));

      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - count - 1,
        resetTime: (window + 1) * this.config.windowMs,
      };
    } catch (error) {
      console.error("Rate limiter error:", error);
      // On error, allow the request (fail open)
      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
      };
    }
  }

  /**
   * Generate rate limit key for request
   */
  private generateKey(request: NextRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }

    // Default key generation based on IP and user agent
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get("user-agent") || "";
    return `${ip}:${this.hashString(userAgent)}`;
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const cfConnectingIP = request.headers.get("cf-connecting-ip");

    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(",")[0].trim();

    return "unknown";
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // General API rate limit
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },

  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },

  // Product scraping
  SCRAPING: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },

  // Task creation
  TASK_CREATION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
  },

  // Monitoring endpoints
  MONITORING: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  },
} as const;

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
    const rateLimiter = new RateLimiter(redis, config);

    const result = await rateLimiter.checkLimit(request);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": result.retryAfter?.toString() || "60",
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.resetTime.toString(),
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    return null; // Continue to next middleware
  };
}

/**
 * Apply rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.resetTime.toString());

  return response;
}

/**
 * User-specific rate limiter
 */
export function createUserRateLimiter(config: RateLimitConfig) {
  return new RateLimiter(
    new Redis(process.env.REDIS_URL || "redis://localhost:6379"),
    {
      ...config,
      keyGenerator: (request: NextRequest) => {
        // Extract user ID from request (from JWT token, session, etc.)
        const authHeader = request.headers.get("authorization");
        if (authHeader) {
          // In a real implementation, you would decode the JWT token
          // and extract the user ID
          const userId = "user_id_from_token"; // This would be extracted from JWT
          return `user:${userId}`;
        }
        return "anonymous";
      },
    }
  );
}
