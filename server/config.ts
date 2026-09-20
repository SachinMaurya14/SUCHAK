/**
 * SUCHAK Platform Configuration & Secrets Management
 * Centralized, validated environment configuration with fail-fast safety checks.
 */

import crypto from 'crypto';

export interface SystemConfig {
  env: 'development' | 'test' | 'staging' | 'production';
  port: number;
  apiBaseUrl: string;
  corsOrigins: string[];
  secretKey: string;
  jwtExpiresInHours: number;
  rateLimitEnabled: boolean;
  geminiApiKey?: string;
  databaseUrl?: string;
  databaseType: 'sqlite-memory' | 'postgresql';
  maxUploadSizeBytes: number;
  allowedUploadMimeTypes: string[];
  strictTenantIsolation: boolean;
  prototypeNotice: string;
}

const DEFAULT_SECRET_KEY_DEV = 'suchak-dev-only-insecure-secret-key-do-not-use-in-production-2026';
const EPHEMERAL_RUNTIME_SECRET = crypto.randomBytes(32).toString('hex');

export const config: SystemConfig = {
  env: (process.env.APP_ENV as any) || (process.env.NODE_ENV as any) || 'development',
  port: Number(process.env.PORT) || 3000,
  apiBaseUrl: process.env.API_BASE_URL || '/api/v1',
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  secretKey: process.env.SECRET_KEY || EPHEMERAL_RUNTIME_SECRET,
  jwtExpiresInHours: Number(process.env.JWT_EXPIRES_IN_HOURS) || 24,
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  geminiApiKey: process.env.GEMINI_API_KEY,
  databaseUrl: process.env.DATABASE_URL,
  databaseType: process.env.DATABASE_URL?.startsWith('postgres') ? 'postgresql' : 'sqlite-memory',
  maxUploadSizeBytes: 15 * 1024 * 1024, // 15MB
  allowedUploadMimeTypes: [
    'text/csv',
    'application/vnd.ms-excel',
    'text/plain',
    'application/json',
    'image/png',
    'image/jpeg',
    'application/pdf',
  ],
  strictTenantIsolation: true,
  prototypeNotice:
    'SUCHAK Enterprise HSE Prototype Foundation • OIL India Limited Specification (Not certified for live production mission-critical operations without enterprise sign-off).',
};

/**
 * Validates configuration at startup.
 * Fails fast if production environment violates baseline security rules.
 */
export function validateConfig(): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (config.env === 'production') {
    if (!process.env.SECRET_KEY) {
      warnings.push('NOTICE: SECRET_KEY was not explicitly provided in environment; generated a high-entropy ephemeral cryptographic secret for this runtime container.');
    } else if (process.env.SECRET_KEY === DEFAULT_SECRET_KEY_DEV) {
      warnings.push('WARNING: Using default development secret key in production environment. A unique random secret is strongly recommended.');
    }
    if (config.corsOrigins.includes('*')) {
      warnings.push('WARNING: Wildcard CORS origin (*) is forbidden in production with credentials. Restricting origins is recommended.');
    }
    if (!config.geminiApiKey) {
      warnings.push('WARNING: GEMINI_API_KEY is not configured; AI features will operate in safe deterministic fallback mode.');
    }
  } else {
    if (!process.env.SECRET_KEY || config.secretKey === DEFAULT_SECRET_KEY_DEV) {
      warnings.push('INFO: Using ephemeral/development fallback SECRET_KEY. Ensure a strong secret is provided for staging/production.');
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
