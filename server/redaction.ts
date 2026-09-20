/**
 * Redaction utility for logs, error messages, and telemetry payloads.
 * Protects passwords, authorization tokens, database strings, and API keys.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'passwordhash',
  'salt',
  'authorization',
  'cookie',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'secretkey',
  'gemini_api_key',
  'geminiapikey',
  'apikey',
  'api_key',
  'private_key',
  'privatekey',
  'credentials',
]);

export function redactSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact Bearer tokens
    let sanitized = data.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
    // Redact database passwords in URLs postgresql://user:pass@host/db
    sanitized = sanitized.replace(/(:\/\/[^:]+:)([^@]+)(@)/g, '$1[REDACTED]$3');
    // Redact suspected API keys (e.g. AIzaSy...)
    sanitized = sanitized.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  if (typeof data === 'object') {
    const redacted: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(value);
      }
    }
    return redacted;
  }

  return data;
}

/**
 * Sanitizes CSV values to prevent formula injection when opened in spreadsheet programs (Excel, LibreOffice).
 * Characters =, +, -, @, \t, \r at the start of a cell are escaped with a leading single quote.
 */
export function sanitizeCsvField(field: any): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
