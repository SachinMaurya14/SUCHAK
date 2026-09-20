/**
 * Security Middleware Layer for SUCHAK
 * Enforces Request IDs, Security Headers, CORS, Rate Limiting, Authentication, RBAC,
 * Tenant Isolation, and Sanitized Error Handling.
 */
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { authStore } from './authStore.ts';
import { AuthSession, Permission, UserRole } from './authTypes.ts';
import { config } from './config.ts';
import { logger } from './logger.ts';

// Extend Express Request interface with Auth & Request ID
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      auth?: AuthSession;
    }
  }
}

/**
 * 1. Request ID Middleware
 * Assigns or propagates an immutable correlation ID across the request lifecycle.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.header('X-Request-ID') || req.header('X-Correlation-ID');
  const requestId =
    incomingId && /^[a-zA-Z0-9_\-\.]{8,64}$/.test(incomingId)
      ? incomingId
      : `req-${crypto.randomBytes(8).toString('hex')}`;

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * 2. Security Headers Middleware
 * Protects against MIME sniffing, clickjacking, and uncontrolled referrer leakage.
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (config.env === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

/**
 * 3. In-Memory Rate Limiter
 * Guards against brute force, denial of service, and excessive compute abuse.
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export type RateLimitCategory = 'AUTH' | 'AI_EVAL' | 'STANDARD' | 'EXPORT';

const LIMIT_CONFIG: Record<RateLimitCategory, { max: number; windowMs: number }> = {
  AUTH: { max: 15, windowMs: 60 * 1000 }, // 15 requests/min for login/refresh
  AI_EVAL: { max: 30, windowMs: 60 * 1000 }, // 30 requests/min for expensive inference/eval runs
  EXPORT: { max: 20, windowMs: 60 * 1000 }, // 20 requests/min for bulk data exports
  STANDARD: { max: 200, windowMs: 60 * 1000 }, // 200 requests/min for general queries
};

export function rateLimiterMiddleware(category: RateLimitCategory = 'STANDARD') {
  const { max, windowMs } = LIMIT_CONFIG[category];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.rateLimitEnabled) {
      return next();
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
    const key = `${category}:${clientIp}`;
    const now = Date.now();

    let bucket = rateLimitBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 1, resetAt: now + windowMs };
      rateLimitBuckets.set(key, bucket);
    } else {
      bucket.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - bucket.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);

      authStore.logSecurityEvent({
        event_type: 'RATE_LIMIT_EXCEEDED',
        ip_address: clientIp,
        action_summary: `Rate limit threshold exceeded for category ${category} (${bucket.count}/${max})`,
        outcome: 'BLOCKED',
        request_id: req.requestId,
        details: { category, count: bucket.count, max },
      });

      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests for category ${category}. Please retry after ${retryAfterSec} seconds.`,
          request_id: req.requestId,
        },
      });
    }

    next();
  };
}

/**
 * 4. Authentication Middleware
 * Resolves Bearer token or session token, checks validity, and sets req.auth.
 */
export function authMiddleware(options: { optional?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Check Authorization: Bearer <token>
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.header('X-Session-Token')) {
      token = req.header('X-Session-Token')!.trim();
    }

    if (!token) {
      if (options.optional) {
        return next();
      }
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication credentials are required to access this resource.',
          request_id: req.requestId,
        },
      });
    }

    const session = authStore.getSession(token);
    if (!session) {
      if (options.optional) {
        return next();
      }
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Session token is invalid or has expired. Please sign in again.',
          request_id: req.requestId,
        },
      });
    }

    req.auth = session;
    next();
  };
}

/**
 * 5. RBAC Permission Guard
 * Enforces specific functional permission requirement.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication is required before checking permissions.',
          request_id: req.requestId,
        },
      });
    }

    const hasPerm = req.auth.role === 'OrgAdmin' || req.auth.permissions.includes(permission);

    if (!hasPerm) {
      authStore.logSecurityEvent({
        event_type: 'PERMISSION_DENIED',
        actor_id: req.auth.user_id,
        actor_email: req.auth.email,
        actor_role: req.auth.role,
        organization_id: req.auth.organization_id,
        action_summary: `User lacks required permission: ${permission}`,
        outcome: 'DENIED',
        request_id: req.requestId,
        details: { required_permission: permission, current_role: req.auth.role },
      });

      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Your role (${req.auth.role}) lacks the required permission: ${permission}.`,
          request_id: req.requestId,
        },
      });
    }

    next();
  };
}

/**
 * 6. RBAC Role Guard
 * Enforces role membership.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication is required.',
          request_id: req.requestId,
        },
      });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      authStore.logSecurityEvent({
        event_type: 'PERMISSION_DENIED',
        actor_id: req.auth.user_id,
        actor_email: req.auth.email,
        actor_role: req.auth.role,
        organization_id: req.auth.organization_id,
        action_summary: `User role ${req.auth.role} not in allowed list [${allowedRoles.join(', ')}]`,
        outcome: 'DENIED',
        request_id: req.requestId,
      });

      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Role ${req.auth.role} is not authorized for this action.`,
          request_id: req.requestId,
        },
      });
    }

    next();
  };
}

/**
 * 7. Tenant Isolation Enforcer
 * Validates that requested resource organization matches authenticated tenant scope.
 */
export function enforceTenantIsolation(req: Request, res: Response, resourceOrgId?: string): boolean {
  if (!config.strictTenantIsolation) return true;

  if (!req.auth) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication is required for tenant validation.',
        request_id: req.requestId,
      },
    });
    return false;
  }

  // If resource has an explicit organization_id, it must match the session's organization_id
  if (resourceOrgId && resourceOrgId !== req.auth.organization_id) {
    authStore.logSecurityEvent({
      event_type: 'CROSS_SCOPE_ACCESS_BLOCKED',
      actor_id: req.auth.user_id,
      actor_email: req.auth.email,
      actor_role: req.auth.role,
      organization_id: req.auth.organization_id,
      target_resource: resourceOrgId,
      action_summary: `Cross-tenant access blocked: ${req.auth.email} (Org: ${req.auth.organization_id}) attempted to access resource in Org: ${resourceOrgId}`,
      outcome: 'BLOCKED',
      request_id: req.requestId,
      details: { requested_org: resourceOrgId, user_org: req.auth.organization_id },
    });

    res.status(403).json({
      error: {
        code: 'TENANT_ISOLATION_VIOLATION',
        message: 'Access denied: Cross-organization data boundary violation.',
        request_id: req.requestId,
      },
    });
    return false;
  }

  return true;
}

/**
 * 8. Centralized Safe Error Handler
 * Produces structured JSON errors without leaking stack traces or credentials.
 */
export function secureErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  logger.error(`Unhandled error during request ${req.requestId}: ${err.message}`, {
    request_id: req.requestId,
    actor: req.auth?.email,
    data: { stack: err.stack },
  });

  const statusCode = err.status || err.statusCode || 500;
  const isDev = config.env === 'development';

  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: isDev ? err.message : 'An internal operational error occurred. Please contact HSE platform support.',
      request_id: req.requestId,
    },
  });
}
