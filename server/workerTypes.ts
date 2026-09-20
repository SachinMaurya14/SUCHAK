/**
 * SUCHAK Background Worker & Queue Types
 * Standardized job interface, lifecycle states, retry parameters, and telemetry.
 */

export type JobType =
  | 'BULK_REPORT_ANALYSIS'
  | 'SEMANTIC_INDEX_REBUILD'
  | 'MODEL_EVALUATION_RUN'
  | 'ALERT_DISPATCH_BATCH'
  | 'ANALYTICS_SNAPSHOT'
  | 'BACKUP_VERIFICATION';

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER';

export type JobPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export interface BackgroundJob<T = any> {
  id: string;
  type: JobType;
  tenantId: string;
  actorUserId?: string;
  idempotencyKey: string;
  priority: JobPriority;
  status: JobStatus;
  payload: T;
  result?: any;
  error?: string;
  attempts: number;
  maxRetries: number;
  timeoutSeconds: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  nextRetryAt?: string;
  workerId?: string;
}

export interface QueueTelemetry {
  status: 'ONLINE' | 'DRAINING' | 'PAUSED';
  workerPoolSize: number;
  activeWorkers: number;
  queuedJobsCount: number;
  processingJobsCount: number;
  completedJobsCount: number;
  failedJobsCount: number;
  deadLetterJobsCount: number;
  averageExecutionTimeMs: number;
  jobsByType: Record<JobType, number>;
  lastProcessedAt?: string;
}
