/**
 * Structured Application Logger for SUCHAK
 * Outputs machine-parseable JSON with correlation request IDs, log level, and redaction.
 */
import { redactSensitiveData } from './redaction.ts';
import { config } from './config.ts';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  request_id?: string;
  actor?: string;
  organization_id?: string;
  event?: string;
  message: string;
  data?: any;
}

class StructuredLogger {
  private isLevelEnabled(level: LogLevel): boolean {
    if (config.env === 'production' && level === 'DEBUG') {
      return false;
    }
    return true;
  }

  private write(level: LogLevel, message: string, meta?: Partial<LogEntry>) {
    if (!this.isLevelEnabled(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'SUCHAK-HSE-PLATFORM',
      environment: config.env,
      message,
      request_id: meta?.request_id,
      actor: meta?.actor,
      organization_id: meta?.organization_id,
      event: meta?.event,
      data: meta?.data ? redactSensitiveData(meta.data) : undefined,
    };

    const jsonStr = JSON.stringify(entry);

    if (level === 'ERROR') {
      console.error(jsonStr);
    } else if (level === 'WARN' || level === 'SECURITY') {
      console.warn(jsonStr);
    } else {
      console.log(jsonStr);
    }
  }

  debug(message: string, meta?: Partial<LogEntry>) {
    this.write('DEBUG', message, meta);
  }

  info(message: string, meta?: Partial<LogEntry>) {
    this.write('INFO', message, meta);
  }

  warn(message: string, meta?: Partial<LogEntry>) {
    this.write('WARN', message, meta);
  }

  error(message: string, meta?: Partial<LogEntry>) {
    this.write('ERROR', message, meta);
  }

  security(message: string, meta?: Partial<LogEntry>) {
    this.write('SECURITY', message, meta);
  }
}

export const logger = new StructuredLogger();
