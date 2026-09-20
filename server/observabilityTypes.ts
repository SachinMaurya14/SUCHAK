/**
 * Phase 16: SUCHAK SRE, Observability, Performance & Reliability Types
 * Grounded in Google SRE principles, Golden Signals, and strict separation between
 * System Operational Health and Industrial HSE Safety Performance.
 */

export type CriticalityTier =
  | 'TIER_0_CORE_AVAILABILITY'  // API, PostgreSQL, Auth/RBAC, Ingestion
  | 'TIER_1_CORE_WORKFLOW'       // Reviews, CAPA Actions, Alerts, Audit Logging
  | 'TIER_2_DEGRADABLE_FEATURE'  // AI Provider NLP, Vector/Semantic Search, Notification Outbox
  | 'TIER_3_SUPPORT_UTILITY';    // Benchmarks, Bulk Exports, Historical Analytics Aggregation

export type DependencyType = 'HARD_DEPENDENCY' | 'SOFT_DEPENDENCY' | 'OPTIONAL_DEPENDENCY';

export interface ServiceComponentRecord {
  id: string;
  name: string;
  role: string;
  is_stateful: boolean;
  tier: CriticalityTier;
  dependencies: Array<{
    service_id: string;
    type: DependencyType;
    fallback_behavior: string;
  }>;
  health_signal: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  scaling_dimension: 'HORIZONTAL_PODS' | 'WORKER_THREADS' | 'STORAGE_CAPACITY' | 'CONNECTION_POOL';
  failure_mode: string;
  recovery_method: string;
  uptime_seconds: number;
  active_replicas: number;
  last_checked_at: string;
}

export type TelemetryClass = 'REAL_USER' | 'SYNTHETIC_SMOKE' | 'LOAD_TEST' | 'CHAOS_TEST';

export interface RequestMetricEntry {
  id: string;
  timestamp: string;
  method: string;
  route: string;
  status_code: number;
  duration_ms: number;
  telemetry_class: TelemetryClass;
  organization_id?: string;
  request_id?: string;
  trace_id?: string;
}

export interface LatencyDistribution {
  count: number;
  p50_ms: number;
  p90_ms: number;
  p95_ms: number;
  p99_ms: number;
  min_ms: number;
  max_ms: number;
  mean_ms: number;
}

export interface GoldenSignals {
  traffic: {
    total_requests: number;
    requests_per_second: number;
    active_connections: number;
  };
  latency: LatencyDistribution;
  errors: {
    client_4xx_count: number;
    server_5xx_count: number;
    error_rate_pct: number;
    last_error_at?: string;
  };
  saturation: {
    process_memory_rss_mb: number;
    process_memory_heap_mb: number;
    event_loop_lag_ms: number;
    db_pool_utilization_pct: number;
    worker_utilization_pct: number;
    cpu_usage_pct: number;
  };
}

export type SloStatus = 'PROPOSED' | 'MEASURED' | 'NOT_YET_ESTABLISHED';

export interface ServiceLevelObjective {
  id: string;
  name: string;
  service: string;
  metric_name: string;
  measurement_window: string;
  target_percentage: number;
  measured_percentage: number | null;
  error_budget_total_pct: number;
  error_budget_remaining_pct: number;
  burn_rate: number; // 1.0 is nominal consumption
  status: SloStatus;
  data_source: string;
  compliance_state: 'COMPLIANT' | 'WARNING' | 'BREACHED' | 'NOT_EVALUATED';
  last_evaluated_at: string;
}

export type IncidentSeverity = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';

export type IncidentStatus =
  | 'DETECTED'
  | 'ACKNOWLEDGED'
  | 'INVESTIGATING'
  | 'MITIGATED'
  | 'RECOVERED'
  | 'CLOSED';

export type RootCauseStatus = 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN';

export interface IncidentRecord {
  incident_id: string;
  severity: IncidentSeverity;
  service_id: string;
  service_name: string;
  status: IncidentStatus;
  start_time: string;
  detected_at: string;
  acknowledged_at?: string;
  mitigated_at?: string;
  resolved_at?: string;
  closed_at?: string;
  owner: string;
  summary: string;
  impact_description: string;
  root_cause_status: RootCauseStatus;
  root_cause_notes?: string;
  remediation_actions: string[];
  runbook_url?: string;
  postmortem_reference?: string;
  related_deployment_version?: string;
  related_trace_id?: string;
  mtta_minutes?: number;
  mttr_minutes?: number;
}

export interface TraceSpan {
  span_id: string;
  trace_id: string;
  parent_span_id?: string;
  service: string;
  name: string;
  start_time: string;
  duration_ms: number;
  status: 'OK' | 'ERROR';
  attributes: Record<string, any>; // Redacted and sanitized attributes
}

export interface DistributedTrace {
  trace_id: string;
  root_request_id: string;
  telemetry_class: TelemetryClass;
  start_time: string;
  total_duration_ms: number;
  has_error: boolean;
  spans: TraceSpan[];
}

export interface PerformanceBaseline {
  operation_name: string;
  sample_count: number;
  p50_ms: number;
  p90_ms: number;
  p95_ms: number;
  p99_ms: number;
  error_rate_pct: number;
  throughput_rps: number;
  established_date: string;
  workload_class: string;
  status: 'MEASURED' | 'PROPOSED' | 'NOT_ESTABLISHED';
}

export interface PerformanceRegressionEvent {
  id: string;
  timestamp: string;
  operation_name: string;
  baseline_p95_ms: number;
  current_p95_ms: number;
  regression_pct: number;
  severity: 'CRITICAL' | 'WARNING' | 'ACCEPTABLE';
  workload_environment: string;
  detected_during: string;
}

export interface CapacityMetric {
  resource_name: string;
  dimension: string;
  unit: string;
  current_utilization: number;
  measured_peak: number;
  configured_limit: number;
  headroom: number;
  headroom_percentage: number;
  bottleneck_risk: 'LOW' | 'MODERATE' | 'HIGH' | 'EXHAUSTED';
  notes: string;
}

export interface FaultScenario {
  id: string;
  name: string;
  target_component: string;
  fault_type: 'LATENCY_INJECTION' | 'SERVICE_DROP' | 'QUEUE_BACKPRESSURE' | 'CIRCUIT_TRIP' | 'STORAGE_UNAVAILABLE';
  description: string;
  is_destructive: boolean; // MUST ALWAYS BE FALSE
  fallback_system: string;
  status: 'INACTIVE' | 'ACTIVE' | 'EVALUATED';
}

export interface FaultInjectionResult {
  scenario_id: string;
  scenario_name: string;
  timestamp: string;
  detection_time_ms: number;
  degraded_gracefully: boolean;
  fallback_engaged: string;
  data_integrity_preserved: boolean;
  recovery_time_ms: number;
  audit_entry_id: string;
}

export type FindingStatus =
  | 'OPEN'
  | 'TRIAGED'
  | 'IN_PROGRESS'
  | 'MITIGATED'
  | 'VERIFIED'
  | 'ACCEPTED_RISK';

export interface SecurityFindingRecord {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  affected_component: string;
  evidence: string;
  remediation: string;
  status: FindingStatus;
  detected_at: string;
  verified_at?: string;
  owner: string;
}

export interface ClientPerformanceBeacon {
  route: string;
  navigation_time_ms: number;
  first_contentful_paint_ms?: number;
  largest_contentful_paint_ms?: number;
  cumulative_layout_shift?: number;
  interaction_to_next_paint_ms?: number;
  api_latency_ms?: number;
  user_agent: string;
  timestamp: string;
}
