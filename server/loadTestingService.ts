/**
 * SUCHAK Controlled Synthetic Load Testing Service
 * Executes bounded synthetic load scenarios against internal engine pipelines,
 * measuring true requests per second (RPS), p50, p95, p99 latencies, and resource consumption.
 * All generated data is explicitly tagged: [LOAD TEST / SYNTHETIC].
 */
import { dataStore } from './dataStore.ts';
import { vectorStore } from './vectorStore.ts';
import { safetyEngine } from './safetyEngine.ts';

export interface LoadTestScenarioConfig {
  scenarioName: 'DASHBOARD_QUERIES' | 'SEMANTIC_SEARCH_STORM' | 'SAFETY_EVAL_PIPELINE' | 'COMPREHENSIVE_MIX';
  concurrentIterations: number;
  syntheticPayloadType: string;
}

export interface LoadTestMetrics {
  scenarioName: string;
  isSynthetic: true;
  label: 'LOAD TEST / SYNTHETIC';
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  durationMs: number;
  requestsPerSecond: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  memoryUsageMb: {
    beforeRss: number;
    afterRss: number;
    deltaRss: number;
  };
  timestamp: string;
}

class LoadTestingService {
  private lastResults: LoadTestMetrics | null = null;

  public async executeScenario(config: LoadTestScenarioConfig): Promise<LoadTestMetrics> {
    const startMem = process.memoryUsage().rss / 1024 / 1024;
    const startTime = Date.now();
    const latencies: number[] = [];
    let successes = 0;
    let failures = 0;

    const iterations = Math.min(Math.max(config.concurrentIterations || 50, 10), 200);

    for (let i = 0; i < iterations; i++) {
      const iterStart = Date.now();
      try {
        if (config.scenarioName === 'DASHBOARD_QUERIES') {
          // Synthetic dashboard analytics aggregation
          const reports = dataStore.getAllReports();
          const sifCount = reports.filter((r) => r.latest_analysis?.sif_potential || r.review_status === 'Verified SIF').length;
          const sites = dataStore.getSites();
          if (!reports || !sites || sifCount < 0) throw new Error('DataStore read failed');
        } else if (config.scenarioName === 'SEMANTIC_SEARCH_STORM') {
          // Synthetic vector similarity query
          const query = i % 2 === 0 ? 'high pressure whip check missing' : 'scaffold fall protection failure';
          const matches = await vectorStore.searchSimilarReports(query, 3);
          if (!matches) throw new Error('Search failed');
        } else if (config.scenarioName === 'SAFETY_EVAL_PIPELINE') {
          // Synthetic safety evaluation text processing
          await safetyEngine.analyzeSafetyReport({
            title: `[LOAD TEST / SYNTHETIC] Pressure line vibration test item #${i}`,
            description: 'Synthetic telemetry payload for performance stress testing. Verifying whip-checks.',
            activity: 'Well Intervention',
            site: 'Duliajan Oilfield',
          });
        } else {
          // COMPREHENSIVE_MIX
          if (i % 3 === 0) {
            dataStore.getAllReports();
          } else if (i % 3 === 1) {
            await vectorStore.searchSimilarReports('confined space toxic gas reading', 2);
          } else {
            await safetyEngine.analyzeSafetyReport({
              title: `[LOAD TEST / SYNTHETIC] Comprehensive load item #${i}`,
              description: 'Routine maintenance observed without lock-out tag-out boundary.',
              activity: 'Energy Isolation',
              site: 'Digboi Refinery',
            });
          }
        }
        successes++;
      } catch (err) {
        failures++;
      } finally {
        latencies.push(Date.now() - iterStart);
      }
    }

    const totalDuration = Date.now() - startTime;
    latencies.sort((a, b) => a - b);

    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const min = latencies[0] || 0;
    const max = latencies[latencies.length - 1] || 0;

    const endMem = process.memoryUsage().rss / 1024 / 1024;
    const rps = totalDuration > 0 ? Math.round((iterations / (totalDuration / 1000)) * 10) / 10 : 0;

    const result: LoadTestMetrics = {
      scenarioName: config.scenarioName,
      isSynthetic: true,
      label: 'LOAD TEST / SYNTHETIC',
      totalRequests: iterations,
      successfulRequests: successes,
      failedRequests: failures,
      durationMs: totalDuration,
      requestsPerSecond: rps,
      latencyP50Ms: p50,
      latencyP95Ms: p95,
      latencyP99Ms: p99,
      minLatencyMs: min,
      maxLatencyMs: max,
      memoryUsageMb: {
        beforeRss: Math.round(startMem * 10) / 10,
        afterRss: Math.round(endMem * 10) / 10,
        deltaRss: Math.round((endMem - startMem) * 10) / 10,
      },
      timestamp: new Date().toISOString(),
    };

    this.lastResults = result;
    return result;
  }

  public getLastResults(): LoadTestMetrics | null {
    return this.lastResults;
  }
}

export const loadTestingService = new LoadTestingService();
