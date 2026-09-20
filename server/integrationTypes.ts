/**
 * Enterprise Integration Framework & External Connector Types
 * SUCHAK HSE Safety Intelligence Platform - Phase 18
 */

export type ConnectorType =
  | 'REST_API'
  | 'WEBHOOK'
  | 'FILE_CSV'
  | 'SFTP'
  | 'DATABASE_INTEGRATION'
  | 'MESSAGE_EVENT';

export type ConnectorProvider =
  | 'OIL_HSSE'
  | 'SAP_EHS'
  | 'ENABLON'
  | 'CORITY'
  | 'GENERIC_REST'
  | 'GENERIC_WEBHOOK';

export type ConnectorStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'DISABLED'
  | 'ERROR';

export type OilHsseMode =
  | 'DISABLED'
  | 'DRY_RUN'
  | 'SANDBOX'
  | 'ACTIVE';

export type RecordIngestionStatus =
  | 'IMPORTED'
  | 'SKIPPED_DUPLICATE'
  | 'INVALID'
  | 'REVIEW_REQUIRED'
  | 'FAILED';

export interface SecretReference {
  type: 'env' | 'vault' | 'secret_manager';
  reference_key: string;
  is_configured: boolean;
}

export interface ConnectorAuthConfiguration {
  auth_type: 'API_KEY' | 'BEARER_TOKEN' | 'OAUTH2_CLIENT_CREDENTIALS' | 'MUTUAL_TLS' | 'HMAC_SIGNATURE' | 'NONE';
  header_name?: string;
  credential_secret_ref: SecretReference;
  oauth_token_url?: string;
  oauth_client_id?: string;
  client_cert_secret_ref?: SecretReference;
}

export interface FieldMappingRule {
  external_field: string;
  canonical_field: string;
  transform?: 'direct' | 'date_iso' | 'uppercase' | 'lowercase' | 'split_first' | 'map_lookup';
  value_lookup_map?: Record<string, string>;
  required?: boolean;
}

export interface ConnectorConfiguration {
  endpoint_url: string;
  timeout_ms: number;
  max_retries: number;
  rate_limit_per_minute: number;
  auth: ConnectorAuthConfiguration;
  allowed_ip_cidrs?: string[];
  field_mappings: FieldMappingRule[];
  default_site_id?: string;
  custom_headers?: Record<string, string>;
  sync_schedule_cron?: string;
}

export interface EnterpriseConnector {
  connector_id: string;
  organization_id: string;
  connector_type: ConnectorType;
  provider: ConnectorProvider;
  display_name: string;
  description: string;
  status: ConnectorStatus;
  oil_hsse_mode?: OilHsseMode;
  configuration: ConnectorConfiguration;
  schema_version: string;
  last_validation?: {
    timestamp: string;
    valid: boolean;
    errors: string[];
    warnings: string[];
    connectivity_check: 'NOT_RUN' | 'SUCCESS' | 'FAILED' | 'SKIPPED_DRY_RUN';
  };
  last_sync?: {
    timestamp: string;
    records_processed: number;
    records_imported: number;
    records_duplicate: number;
    records_failed: number;
    duration_ms: number;
    sync_mode: 'MANUAL' | 'SCHEDULED' | 'DRY_RUN' | 'WEBHOOK';
    status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  };
  created_at: string;
  updated_at: string;
  created_by: string;
}

/**
 * Raw External Safety Report before canonical translation
 */
export interface RawExternalSafetyReport {
  external_id: string;
  incident_datetime?: string;
  event_date?: string;
  site_code?: string;
  site_name?: string;
  location_name?: string;
  activity_code?: string;
  activity_name?: string;
  classification?: string;
  incident_type?: string;
  description: string;
  consequences?: string;
  injury_count?: number;
  equipment_damage?: boolean;
  raw_payload?: Record<string, any>;
}

/**
 * Canonical Ingestion Safety Report
 */
export interface CanonicalExternalReport {
  source_system: string;
  source_record_id: string;
  source_schema_version: string;
  organization_id: string;
  report_type: string;
  site_id: string;
  location_id?: string;
  activity_id?: string;
  report_datetime: string;
  description: string;
  actual_outcome?: string | null;
  data_classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  metadata: Record<string, any>;
}

export interface IngestionRecordResult {
  source_record_id: string;
  suchak_report_id?: string;
  report_number?: string;
  status: RecordIngestionStatus;
  reasons: string[];
  deduplication_fingerprint?: string;
}

export interface IngestionBatchResult {
  batch_id: string;
  connector_id: string;
  organization_id: string;
  total_records: number;
  imported_count: number;
  duplicate_count: number;
  invalid_count: number;
  failed_count: number;
  review_required_count: number;
  duration_ms: number;
  is_dry_run: boolean;
  reconciliation: {
    external_declared_count: number;
    matching_checksum: boolean;
    unmatched_count: number;
  };
  results: IngestionRecordResult[];
  timestamp: string;
}

export type OutboundEventType =
  | 'SAFETY_REPORT_CREATED_V1'
  | 'SAFETY_REPORT_UPDATED_V1'
  | 'REVIEW_COMPLETED_V1'
  | 'ACTION_STATUS_CHANGED_V1'
  | 'ALERT_TRIGGERED_V1';

export interface OutboundWebhookRegistration {
  webhook_id: string;
  organization_id: string;
  destination_url: string;
  event_types: OutboundEventType[];
  secret_token_ref: SecretReference;
  is_active: boolean;
  retry_limit: number;
  created_at: string;
  last_delivery?: {
    timestamp: string;
    status_code: number;
    success: boolean;
    duration_ms: number;
  };
}

export interface OutboundWebhookDelivery {
  delivery_id: string;
  webhook_id: string;
  event_type: OutboundEventType;
  payload: Record<string, any>;
  attempt: number;
  status: 'SUCCESS' | 'RETRYING' | 'FAILED' | 'SSRF_BLOCKED';
  status_code?: number;
  timestamp: string;
  error?: string;
}
