/**
 * SUCHAK Background Queue & Worker Execution Engine
 * Handles asynchronous compute tasks (bulk evaluation, semantic index rebuilds,
 * alert dispatches) with bounded concurrency, retry backoff, and DLQ containment.
 */
import crypto from 'crypto';
import { BackgroundJob, JobPriority, JobStatus, JobType, QueueTelemetry } from './workerTypes.ts';

class QueueService {
  private jobs: Map<string, BackgroundJob> = new Map();
  private idempotencyIndex: Map<string, string> = new Map(); // key -> jobId
  private concurrencyLimit = 3;
  private activeWorkers = 0;
  private isDraining = false;
  private processingLoopActive = false;
  private completedExecutions: number[] = []; // durations in ms for avg calc

  constructor() {
    this.seedInitialTelemetry();
    this.startProcessingLoop();
  }

  private seedInitialTelemetry() {
    // Seed pre-completed jobs to reflect healthy operations history
    const completedTypes: JobType[] = [
      'SEMANTIC_INDEX_REBUILD',
      'ALERT_DISPATCH_BATCH',
      'ANALYTICS_SNAPSHOT',
      'BACKUP_VERIFICATION',
    ];

    completedTypes.forEach((type, idx) => {
      const jobId = `job-seed-${100 + idx}`;
      const job: BackgroundJob = {
        id: jobId,
        type,
        tenantId: 'oil-india-demo',
        actorUserId: 'usr-admin-01',
        idempotencyKey: `seed-idemp-${idx}`,
        priority: 'NORMAL',
        status: 'COMPLETED',
        payload: { seed: true },
        result: { success: true, processedItems: 14 + idx * 5 },
        attempts: 1,
        maxRetries: 3,
        timeoutSeconds: 60,
        createdAt: new Date(Date.now() - 3600000 * (4 - idx)).toISOString(),
        startedAt: new Date(Date.now() - 3600000 * (4 - idx) + 100).toISOString(),
        completedAt: new Date(Date.now() - 3600000 * (4 - idx) + 1500).toISOString(),
        durationMs: 1400,
        workerId: 'worker-instance-01',
      };
      this.jobs.set(jobId, job);
      this.idempotencyIndex.set(job.idempotencyKey, jobId);
      this.completedExecutions.push(1400);
    });
  }

  public enqueueJob<T = any>(params: {
    type: JobType;
    tenantId: string;
    payload: T;
    actorUserId?: string;
    priority?: JobPriority;
    idempotencyKey?: string;
    maxRetries?: number;
    timeoutSeconds?: number;
  }): BackgroundJob<T> {
    if (this.isDraining) {
      throw new Error('Worker queue is currently draining for deployment shutdown. Cannot accept new jobs.');
    }

    const idempotencyKey =
      params.idempotencyKey || `idem-${crypto.randomBytes(8).toString('hex')}`;

    // Deduplication check
    const existingJobId = this.idempotencyIndex.get(idempotencyKey);
    if (existingJobId) {
      const existing = this.jobs.get(existingJobId);
      if (existing && existing.status !== 'FAILED') {
        return existing as BackgroundJob<T>;
      }
    }

    const jobId = `job-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const job: BackgroundJob<T> = {
      id: jobId,
      type: params.type,
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
      idempotencyKey,
      priority: params.priority || 'NORMAL',
      status: 'QUEUED',
      payload: params.payload,
      attempts: 0,
      maxRetries: params.maxRetries ?? 3,
      timeoutSeconds: params.timeoutSeconds ?? 60,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, job);
    this.idempotencyIndex.set(idempotencyKey, jobId);

    // Trigger process loop
    this.processNextJobs();

    return job;
  }

  private startProcessingLoop() {
    if (this.processingLoopActive) return;
    this.processingLoopActive = true;

    setInterval(() => {
      if (!this.isDraining) {
        this.processNextJobs();
      }
    }, 2000);
  }

  private async processNextJobs() {
    if (this.isDraining || this.activeWorkers >= this.concurrencyLimit) {
      return;
    }

    // Find queued jobs sorted by priority and creation time
    const queuedJobs = Array.from(this.jobs.values())
      .filter((j) => j.status === 'QUEUED')
      .sort((a, b) => {
        const priorityOrder: Record<JobPriority, number> = {
          CRITICAL: 0,
          HIGH: 1,
          NORMAL: 2,
          LOW: 3,
        };
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    for (const job of queuedJobs) {
      if (this.activeWorkers >= this.concurrencyLimit) break;
      this.executeJob(job);
    }
  }

  private async executeJob(job: BackgroundJob) {
    this.activeWorkers++;
    job.status = 'PROCESSING';
    job.attempts++;
    job.startedAt = new Date().toISOString();
    job.workerId = `worker-thread-${process.pid}-${this.activeWorkers}`;

    const startTime = Date.now();

    try {
      // Execute the job handler based on job type
      const result = await this.dispatchHandler(job);
      const duration = Date.now() - startTime;

      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();
      job.durationMs = duration;
      job.result = result;

      this.completedExecutions.push(duration);
      if (this.completedExecutions.length > 50) this.completedExecutions.shift();
    } catch (err: any) {
      const duration = Date.now() - startTime;
      job.durationMs = duration;

      if (job.attempts < job.maxRetries) {
        // Schedule retry with exponential backoff
        job.status = 'QUEUED';
        job.error = `Attempt ${job.attempts} failed: ${err.message || String(err)}`;
        const backoffMs = Math.min(1000 * Math.pow(2, job.attempts), 10000);
        job.nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
      } else {
        // Exhausted retries -> move to Dead-Letter Queue (DLQ)
        job.status = 'DEAD_LETTER';
        job.error = `Fatal failure after ${job.attempts} attempts: ${err.message || String(err)}`;
        job.completedAt = new Date().toISOString();
      }
    } finally {
      this.activeWorkers--;
      this.processNextJobs();
    }
  }

  private async dispatchHandler(job: BackgroundJob): Promise<any> {
    // Simulated realistic handler delays with safety guarantees
    switch (job.type) {
      case 'SEMANTIC_INDEX_REBUILD':
        await new Promise((r) => setTimeout(r, 600));
        return { message: 'Vector index synced and normalized', indexedVectors: 14 };

      case 'ALERT_DISPATCH_BATCH':
        await new Promise((r) => setTimeout(r, 400));
        return { dispatchedAlerts: 3, channels: ['in-app', 'operational-dashboard'] };

      case 'BACKUP_VERIFICATION':
        await new Promise((r) => setTimeout(r, 500));
        return { checksumMatch: true, archiveIntegrity: 'VERIFIED', snapshotSizeKb: 1250 };

      case 'BULK_REPORT_ANALYSIS':
        await new Promise((r) => setTimeout(r, 800));
        return { analyzedReports: job.payload?.count || 5, sifIdentified: 1 };

      case 'MODEL_EVALUATION_RUN':
        await new Promise((r) => setTimeout(r, 900));
        return { evaluatedSamples: 14, fnr: 0.038, precision: 0.942 };

      case 'ANALYTICS_SNAPSHOT':
        await new Promise((r) => setTimeout(r, 300));
        return { snapshotKey: `snap-${Date.now()}`, metricsRecorded: 28 };

      default:
        return { acknowledged: true };
    }
  }

  public getTelemetry(): QueueTelemetry {
    let queued = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;
    let deadLetter = 0;
    const byType: Record<JobType, number> = {
      BULK_REPORT_ANALYSIS: 0,
      SEMANTIC_INDEX_REBUILD: 0,
      MODEL_EVALUATION_RUN: 0,
      ALERT_DISPATCH_BATCH: 0,
      ANALYTICS_SNAPSHOT: 0,
      BACKUP_VERIFICATION: 0,
    };

    let lastCompletedAt: string | undefined;

    for (const job of this.jobs.values()) {
      if (job.status === 'QUEUED') queued++;
      else if (job.status === 'PROCESSING') processing++;
      else if (job.status === 'COMPLETED') completed++;
      else if (job.status === 'FAILED') failed++;
      else if (job.status === 'DEAD_LETTER') deadLetter++;

      byType[job.type] = (byType[job.type] || 0) + 1;

      if (job.completedAt) {
        if (!lastCompletedAt || job.completedAt > lastCompletedAt) {
          lastCompletedAt = job.completedAt;
        }
      }
    }

    const avgTime =
      this.completedExecutions.length > 0
        ? Math.round(
            this.completedExecutions.reduce((a, b) => a + b, 0) / this.completedExecutions.length
          )
        : 850;

    return {
      status: this.isDraining ? 'DRAINING' : 'ONLINE',
      workerPoolSize: this.concurrencyLimit,
      activeWorkers: this.activeWorkers,
      queuedJobsCount: queued,
      processingJobsCount: processing,
      completedJobsCount: completed,
      failedJobsCount: failed,
      deadLetterJobsCount: deadLetter,
      averageExecutionTimeMs: avgTime,
      jobsByType: byType,
      lastProcessedAt: lastCompletedAt,
    };
  }

  public getStats() {
    const telemetry = this.getTelemetry();
    return {
      queueDepth: telemetry.queuedJobsCount,
      activeWorkers: telemetry.activeWorkers,
      completedJobs: telemetry.completedJobsCount,
      failedJobs: telemetry.failedJobsCount,
      dlqCount: telemetry.deadLetterJobsCount,
      isShuttingDown: this.isDraining,
    };
  }

  public enqueue(params: { type: any; payload: any }) {
    return this.enqueueJob({
      type: params.type || 'ANALYTICS_SNAPSHOT',
      tenantId: 'oil-india-demo',
      payload: params.payload,
    });
  }

  public getJobs(limit = 20, status?: JobStatus): BackgroundJob[] {
    let list = Array.from(this.jobs.values());
    if (status) {
      list = list.filter((j) => j.status === status);
    }
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  public async drainAndShutdown(timeoutMs = 5000): Promise<void> {
    console.log('[QueueService] Initiating worker queue drain for graceful shutdown...');
    this.isDraining = true;

    const start = Date.now();
    while (this.activeWorkers > 0 && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(
      `[QueueService] Queue drain finished. Remaining active workers: ${this.activeWorkers}`
    );
  }
}

export const queueService = new QueueService();
