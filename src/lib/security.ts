import { NextRequest, NextResponse } from "next/server";
import { createRateLimitMiddleware, RATE_LIMITS } from "./rateLimiter";
import { getEncryptionService } from "./encryption";

interface SecurityConfig {
  enableRateLimiting: boolean;
  enableCORS: boolean;
  enableCSRF: boolean;
  enableXSSProtection: boolean;
  enableContentTypeValidation: boolean;
  allowedOrigins: string[];
  trustedProxies: string[];
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableRateLimiting: true,
  enableCORS: true,
  enableCSRF: true,
  enableXSSProtection: true,
  enableContentTypeValidation: true,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
  ],
  trustedProxies: process.env.TRUSTED_PROXIES?.split(",") || [],
};

export class SecurityMiddleware {
  private config: SecurityConfig;
  private encryptionService = getEncryptionService();

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Apply all security middleware
   */
  async applySecurity(request: NextRequest): Promise<NextResponse | null> {
    // Apply CORS
    if (this.config.enableCORS) {
      const corsResponse = this.handleCORS(request);
      if (corsResponse) return corsResponse;
    }

    // Apply rate limiting
    if (this.config.enableRateLimiting) {
      const rateLimitResponse = await this.handleRateLimit(request);
      if (rateLimitResponse) return rateLimitResponse;
    }

    // Apply CSRF protection
    if (this.config.enableCSRF) {
      const csrfResponse = this.handleCSRF(request);
      if (csrfResponse) return csrfResponse;
    }

    // Apply XSS protection
    if (this.config.enableXSSProtection) {
      const xssResponse = this.handleXSSProtection(request);
      if (xssResponse) return xssResponse;
    }

    // Apply content type validation
    if (this.config.enableContentTypeValidation) {
      const contentTypeResponse = this.handleContentTypeValidation(request);
      if (contentTypeResponse) return contentTypeResponse;
    }

    return null; // Continue to next middleware
  }

  /**
   * Handle CORS
   */
  private handleCORS(request: NextRequest): NextResponse | null {
    const origin = request.headers.get("origin");
    const method = request.method;

    // Handle preflight requests
    if (method === "OPTIONS") {
      const response = new NextResponse(null, { status: 200 });

      if (origin && this.config.allowedOrigins.includes(origin)) {
        response.headers.set("Access-Control-Allow-Origin", origin);
      }

      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-CSRF-Token"
      );
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Max-Age", "86400");

      return response;
    }

    // Handle actual requests
    if (origin && this.config.allowedOrigins.includes(origin)) {
      // CORS headers will be added to the response later
      return null;
    }

    // Block requests from unauthorized origins
    if (origin && !this.config.allowedOrigins.includes(origin)) {
      return NextResponse.json(
        { error: "CORS policy violation" },
        { status: 403 }
      );
    }

    return null;
  }

  /**
   * Handle rate limiting
   */
  private async handleRateLimit(
    request: NextRequest
  ): Promise<NextResponse | null> {
    const pathname = request.nextUrl.pathname;

    // Determine rate limit based on endpoint
    let rateLimitConfig;
    if (pathname.startsWith("/api/auth")) {
      rateLimitConfig = RATE_LIMITS.AUTH;
    } else if (pathname.startsWith("/api/products/scrape")) {
      rateLimitConfig = RATE_LIMITS.SCRAPING;
    } else if (pathname.startsWith("/api/tasks")) {
      rateLimitConfig = RATE_LIMITS.TASK_CREATION;
    } else if (pathname.startsWith("/api/monitoring")) {
      rateLimitConfig = RATE_LIMITS.MONITORING;
    } else {
      rateLimitConfig = RATE_LIMITS.API;
    }

    const rateLimitMiddleware = createRateLimitMiddleware(rateLimitConfig);
    return await rateLimitMiddleware(request);
  }

  /**
   * Handle CSRF protection
   */
  private handleCSRF(request: NextRequest): NextResponse | null {
    const method = request.method;

    // Only protect state-changing methods
    if (!["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      return null;
    }

    const csrfToken = request.headers.get("x-csrf-token");
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    // Validate CSRF token
    if (!csrfToken) {
      return NextResponse.json(
        { error: "CSRF token missing" },
        { status: 403 }
      );
    }

    // Validate origin/referer
    if (origin && !this.config.allowedOrigins.includes(origin)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }

    if (
      referer &&
      !this.config.allowedOrigins.some((allowed) => referer.startsWith(allowed))
    ) {
      return NextResponse.json({ error: "Invalid referer" }, { status: 403 });
    }

    return null;
  }

  /**
   * Handle XSS protection
   */
  private handleXSSProtection(request: NextRequest): NextResponse | null {
    const userAgent = request.headers.get("user-agent");

    // Check for suspicious user agents
    if (userAgent && this.isSuspiciousUserAgent(userAgent)) {
      return NextResponse.json(
        { error: "Suspicious request detected" },
        { status: 403 }
      );
    }

    // Check for XSS patterns in URL
    const url = request.url;
    if (this.containsXSSPattern(url)) {
      return NextResponse.json(
        { error: "XSS attempt detected" },
        { status: 403 }
      );
    }

    return null;
  }

  /**
   * Handle content type validation
   */
  private handleContentTypeValidation(
    request: NextRequest
  ): NextResponse | null {
    const method = request.method;
    const contentType = request.headers.get("content-type");

    // Only validate for methods that expect a body
    if (!["POST", "PUT", "PATCH"].includes(method)) {
      return null;
    }

    // Check if content type is valid
    if (!contentType || !this.isValidContentType(contentType)) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    return null;
  }

  /**
   * Check if user agent is suspicious
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /alert\(/i,
      /document\.cookie/i,
      /document\.write/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * Check if URL contains XSS patterns
   */
  private containsXSSPattern(url: string): boolean {
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /alert\(/i,
      /document\.cookie/i,
      /document\.write/i,
      /eval\(/i,
      /expression\(/i,
    ];

    return xssPatterns.some((pattern) => pattern.test(url));
  }

  /**
   * Check if content type is valid
   */
  private isValidContentType(contentType: string): boolean {
    const validTypes = [
      "application/json",
      "application/x-www-form-urlencoded",
      "multipart/form-data",
      "text/plain",
    ];

    return validTypes.some((type) => contentType.startsWith(type));
  }

  /**
   * Add security headers to response
   */
  addSecurityHeaders(response: NextResponse): NextResponse {
    // Prevent XSS attacks
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");

    // Prevent MIME type sniffing
    response.headers.set("X-Content-Type-Options", "nosniff");

    // Strict Transport Security
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );

    // Content Security Policy
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
    );

    // Referrer Policy
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions Policy
    response.headers.set(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
    );

    return response;
  }

  /**
   * Validate API key
   */
  validateApiKey(request: NextRequest): boolean {
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey) {
      return false;
    }

    // In a real implementation, you would validate against a database
    // For now, we'll just check the format
    return apiKey.startsWith("lunarbot_") && apiKey.length > 20;
  }

  /**
   * Sanitize input data
   */
  sanitizeInput(data: any): any {
    if (typeof data === "string") {
      return this.sanitizeString(data);
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeInput(item));
    }

    if (typeof data === "object" && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(str: string): string {
    return str
      .replace(/[<>]/g, "") // Remove angle brackets
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/vbscript:/gi, "") // Remove vbscript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers
      .trim();
  }
}

// Global security middleware instance
let globalSecurityMiddleware: SecurityMiddleware | null = null;

/**
 * Get or create the global security middleware
 */
export function getSecurityMiddleware(): SecurityMiddleware {
  if (!globalSecurityMiddleware) {
    globalSecurityMiddleware = new SecurityMiddleware();
  }
  return globalSecurityMiddleware;
}

/**
 * Apply security middleware to API route
 */
export async function applySecurityMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const securityMiddleware = getSecurityMiddleware();
  return await securityMiddleware.applySecurity(request);
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  const securityMiddleware = getSecurityMiddleware();
  return securityMiddleware.addSecurityHeaders(response);
}
