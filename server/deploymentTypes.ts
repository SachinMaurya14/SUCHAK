/**
 * SUCHAK Deployment & Cloud Release Engineering Types
 * Release metadata, immutable image tags, migration tracking, and readiness states.
 */

export type ReleaseStatus =
  | 'PREPARING'
  | 'VALIDATING'
  | 'DEPLOYING'
  | 'HEALTH_CHECK'
  | 'ACTIVE'
  | 'FAILED'
  | 'ROLLED_BACK';

export type ReadinessAreaStatus =
  | 'READY'
  | 'PARTIALLY_READY'
  | 'NOT_READY'
  | 'NOT_CONFIGURED'
  | 'MANUAL_VERIFICATION_REQUIRED';

export interface DeploymentRecord {
  deployment_id: string;
  environment: 'staging' | 'production';
  application_version: string;
  image_version: string;
  commit_sha: string;
  migration_version: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
  started_at: string;
  completed_at?: string;
  status: ReleaseStatus;
  rollback_reference?: string;
  release_notes: string;
  active_replicas: number;
  health_checks_passed: boolean;
}

export interface ReadinessMatrixItem {
  area: string;
  category: 'COMPUTE' | 'PERSISTENCE' | 'SECURITY' | 'OBSERVABILITY' | 'OPERATIONS';
  status: ReadinessAreaStatus;
  evidence: string;
  manualActionRequired?: string;
}

export interface DatabasePoolCapacity {
  maxServerConnections: number;
  apiReplicasCount: number;
  poolPerApiReplica: number;
  workerReplicasCount: number;
  poolPerWorkerReplica: number;
  adminReserveConnections: number;
  totalAllocatedConnections: number;
  safeCapacityMarginPct: number;
  haStatus: 'CONFIGURED' | 'NOT_CONFIGURED' | 'MANUAL_SETUP_REQUIRED';
}
