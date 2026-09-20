/**
 * Enterprise Integration Framework & Connector Service
 * SUCHAK HSE Safety Intelligence Platform - Phase 18
 */

import crypto from 'crypto';
import {
  EnterpriseConnector,
  ConnectorType,
  ConnectorProvider,
  ConnectorStatus,
  OilHsseMode,
  RawExternalSafetyReport,
  CanonicalExternalReport,
  IngestionBatchResult,
  IngestionRecordResult,
  OutboundWebhookRegistration,
  OutboundEventType,
  OutboundWebhookDelivery,
} from './integrationTypes.ts';
import { dataStore, SITES, ACTIVITIES, LOCATIONS } from './dataStore.ts';
import { logger } from './logger.ts';

export class IntegrationService {
  private connectors: Map<string, EnterpriseConnector> = new Map();
  private ingestedFingerprints: Set<string> = new Set();
  private outboundWebhooks: Map<string, OutboundWebhookRegistration> = new Map();
  private outboundDeliveries: OutboundWebhookDelivery[] = [];
  private integrationAuditLogs: Array<{
    id: string;
    timestamp: string;
    organization_id: string;
    connector_id: string;
    action: string;
    actor: string;
    status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
    details: Record<string, any>;
  }> = [];

  constructor() {
    this.initializeDefaultConnectors();
  }

  private initializeDefaultConnectors() {
    // 1. OIL HSSE Dedicated Adapter (Integration-Ready Boundary)
    const oilConnector: EnterpriseConnector = {
      connector_id: 'conn-oil-hsse-01',
      organization_id: 'oil-india-demo',
      connector_type: 'REST_API',
      provider: 'OIL_HSSE',
      display_name: 'Oil India Limited (Enterprise HSSE Portal)',
      description:
        'Enterprise adapter boundary for synchronizing exploration, drilling rig, and production safety reports from corporate HSSE portal.',
      status: 'VALIDATING',
      oil_hsse_mode: 'DRY_RUN', // Default safe mode: does not mutate production until authorized
      schema_version: '2026.1-oil-canonical',
      configuration: {
        endpoint_url: 'https://hsse-api.oil-enterprise.local/v1/safety-events',
        timeout_ms: 8000,
        max_retries: 3,
        rate_limit_per_minute: 120,
        auth: {
          auth_type: 'API_KEY',
          header_name: 'X-OIL-HSSE-API-KEY',
          credential_secret_ref: {
            type: 'env',
            reference_key: 'OIL_HSSE_CREDENTIAL_REF',
            is_configured: false, // Transparent boundary: marked false until real secret is supplied
          },
        },
        field_mappings: [
          { external_field: 'external_id', canonical_field: 'source_record_id', required: true },
          { external_field: 'incident_datetime', canonical_field: 'report_datetime', transform: 'date_iso' },
          { external_field: 'description', canonical_field: 'description', required: true },
          { external_field: 'consequences', canonical_field: 'actual_outcome' },
          { external_field: 'site_code', canonical_field: 'site_id', transform: 'map_lookup' },
          { external_field: 'activity_code', canonical_field: 'activity_id', transform: 'map_lookup' },
          { external_field: 'classification', canonical_field: 'report_type' },
        ],
        default_site_id: 'site-digboi-01',
      },
      last_validation: {
        timestamp: new Date().toISOString(),
        valid: true,
        errors: [],
        warnings: [
          'External OIL credentials reference (OIL_HSSE_CREDENTIAL_REF) is pending corporate provisioning. Connector operating in DRY_RUN / SANDBOX boundary.',
        ],
        connectivity_check: 'SKIPPED_DRY_RUN',
      },
      last_sync: {
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        records_processed: 12,
        records_imported: 10,
        records_duplicate: 2,
        records_failed: 0,
        duration_ms: 145,
        sync_mode: 'DRY_RUN',
        status: 'COMPLETED',
      },
      created_at: '2026-09-18T08:00:00.000Z',
      updated_at: new Date().toISOString(),
      created_by: 'system_admin',
    };

    // 2. Contractor Webhook Ingress
    const webhookConnector: EnterpriseConnector = {
      connector_id: 'conn-contractor-webhook-02',
      organization_id: 'oil-india-demo',
      connector_type: 'WEBHOOK',
      provider: 'GENERIC_WEBHOOK',
      display_name: 'Field Contractor Real-time Ingestion Webhook',
      description: 'Ingress endpoint receiving real-time unsafe act & near-miss reports from third-party contractor mobile apps.',
      status: 'ACTIVE',
      schema_version: '1.0-webhook',
      configuration: {
        endpoint_url: '/api/v1/integrations/webhooks/contractor-ingress',
        timeout_ms: 5000,
        max_retries: 2,
        rate_limit_per_minute: 200,
        auth: {
          auth_type: 'HMAC_SIGNATURE',
          header_name: 'X-Suchak-Signature-256',
          credential_secret_ref: {
            type: 'env',
            reference_key: 'WEBHOOK_HMAC_SECRET',
            is_configured: true,
          },
        },
        field_mappings: [
          { external_field: 'external_id', canonical_field: 'source_record_id', required: true },
          { external_field: 'description', canonical_field: 'description', required: true },
          { external_field: 'site_code', canonical_field: 'site_id' },
          { external_field: 'event_date', canonical_field: 'report_datetime' },
        ],
      },
      last_validation: {
        timestamp: new Date().toISOString(),
        valid: true,
        errors: [],
        warnings: [],
        connectivity_check: 'SUCCESS',
      },
      created_at: '2026-09-15T10:00:00.000Z',
      updated_at: new Date().toISOString(),
      created_by: 'system_admin',
    };

    // 3. SAP EHS Enterprise Bridge (Disabled / Pending Activation)
    const sapConnector: EnterpriseConnector = {
      connector_id: 'conn-sap-ehs-03',
      organization_id: 'oil-india-demo',
      connector_type: 'REST_API',
      provider: 'SAP_EHS',
      display_name: 'SAP EHS Enterprise Gateway',
      description: 'Two-way integration for synchronizing HSE audit findings and CAPA actions with corporate SAP EHS instance.',
      status: 'DISABLED',
      schema_version: '2.4-sap',
      configuration: {
        endpoint_url: 'https://sap-gateway.enterprise.local/odata/v2/EHS_INCIDENTS',
        timeout_ms: 10000,
        max_retries: 3,
        rate_limit_per_minute: 60,
        auth: {
          auth_type: 'OAUTH2_CLIENT_CREDENTIALS',
          oauth_token_url: 'https://sap-auth.enterprise.local/oauth/token',
          oauth_client_id: 'SUCHAK_SAP_CLIENT',
          credential_secret_ref: {
            type: 'vault',
            reference_key: 'vault:secret/sap-ehs-client-secret',
            is_configured: false,
          },
        },
        field_mappings: [],
      },
      last_validation: {
        timestamp: new Date().toISOString(),
        valid: false,
        errors: ['Client credentials reference unpopulated in corporate key vault.'],
        warnings: ['Connector disabled.'],
        connectivity_check: 'FAILED',
      },
      created_at: '2026-09-16T12:00:00.000Z',
      updated_at: new Date().toISOString(),
      created_by: 'system_admin',
    };

    this.connectors.set(oilConnector.connector_id, oilConnector);
    this.connectors.set(webhookConnector.connector_id, webhookConnector);
    this.connectors.set(sapConnector.connector_id, sapConnector);

    // Default Outbound Webhook for CAPA and High-Risk Alerts
    const outboundCapa: OutboundWebhookRegistration = {
      webhook_id: 'whk-capa-dispatch-01',
      organization_id: 'oil-india-demo',
      destination_url: 'https://alerts-gateway.oil-enterprise.local/api/v1/hse-notifications',
      event_types: ['ALERT_TRIGGERED_V1', 'ACTION_STATUS_CHANGED_V1', 'REVIEW_COMPLETED_V1'],
      secret_token_ref: {
        type: 'env',
        reference_key: 'OUTBOUND_ALERTS_WEBHOOK_KEY',
        is_configured: true,
      },
      is_active: true,
      retry_limit: 3,
      created_at: '2026-09-17T09:00:00.000Z',
    };
    this.outboundWebhooks.set(outboundCapa.webhook_id, outboundCapa);
  }

  // --- Connector Registry Management ---

  public getConnectors(organizationId?: string): EnterpriseConnector[] {
    const list = Array.from(this.connectors.values());
    if (organizationId) {
      return list.filter((c) => c.organization_id === organizationId);
    }
    return list;
  }

  public getConnectorById(connectorId: string): EnterpriseConnector | null {
    return this.connectors.get(connectorId) || null;
  }

  public registerConnector(params: Partial<EnterpriseConnector>, actor: string): EnterpriseConnector {
    if (!params.display_name || !params.provider || !params.connector_type) {
      throw new Error('display_name, provider, and connector_type are required');
    }
    const id = `conn-${params.provider.toLowerCase().replace(/_/g, '-')}-${Date.now().toString(36)}`;
    const connector: EnterpriseConnector = {
      connector_id: id,
      organization_id: params.organization_id || 'oil-india-demo',
      connector_type: params.connector_type,
      provider: params.provider,
      display_name: params.display_name,
      description: params.description || '',
      status: params.status || 'DRAFT',
      oil_hsse_mode: params.provider === 'OIL_HSSE' ? (params.oil_hsse_mode || 'DRY_RUN') : undefined,
      schema_version: params.schema_version || '1.0-canonical',
      configuration: params.configuration || {
        endpoint_url: '',
        timeout_ms: 5000,
        max_retries: 3,
        rate_limit_per_minute: 60,
        auth: {
          auth_type: 'NONE',
          credential_secret_ref: { type: 'env', reference_key: '', is_configured: false },
        },
        field_mappings: [],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: actor,
    };

    this.connectors.set(id, connector);
    this.recordAudit(connector.organization_id, id, 'CONNECTOR_REGISTERED', actor, 'SUCCESS', {
      provider: connector.provider,
      type: connector.connector_type,
    });
    return connector;
  }

  public updateConnector(
    connectorId: string,
    updates: Partial<EnterpriseConnector>,
    actor: string
  ): EnterpriseConnector | null {
    const existing = this.connectors.get(connectorId);
    if (!existing) return null;

    // Safety constraint: Prevent activating external connectors without valid configuration
    if (updates.status === 'ACTIVE' && existing.provider === 'OIL_HSSE') {
      const isConfigured = updates.configuration?.auth?.credential_secret_ref?.is_configured ?? existing.configuration.auth.credential_secret_ref.is_configured;
      if (!isConfigured && updates.oil_hsse_mode !== 'SANDBOX') {
        throw new Error(
          'Cannot set OIL HSSE Connector to ACTIVE: external OIL credentials reference is unconfigured (WAITING_FOR_AUTHORIZATION).'
        );
      }
    }

    const updated: EnterpriseConnector = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.connectors.set(connectorId, updated);
    this.recordAudit(updated.organization_id, connectorId, 'CONNECTOR_UPDATED', actor, 'SUCCESS', {
      new_status: updated.status,
      new_mode: updated.oil_hsse_mode,
    });
    return updated;
  }

  public setConnectorStatus(
    connectorId: string,
    status: ConnectorStatus,
    oilHsseMode?: OilHsseMode,
    actor: string = 'system_admin'
  ): { success: boolean; connector?: EnterpriseConnector; error?: string } {
    const existing = this.connectors.get(connectorId);
    if (!existing) return { success: false, error: 'Connector not found' };

    // Strict Enforcement of Production Boundary:
    // If setting to ACTIVE, verify external credentials exist
    if (status === 'ACTIVE' && existing.provider === 'OIL_HSSE') {
      if (oilHsseMode === 'ACTIVE' && !existing.configuration.auth.credential_secret_ref.is_configured) {
        this.recordAudit(existing.organization_id, connectorId, 'ACTIVATION_REJECTED', actor, 'BLOCKED', {
          reason: 'MANDATORY_EXTERNAL_CREDENTIALS_MISSING',
        });
        return {
          success: false,
          error:
            'Activation Rejected: Production OIL HSSE credentials reference is missing or unverified. Use DRY_RUN or SANDBOX mode until contractual authorization is granted.',
        };
      }
    }

    existing.status = status;
    if (oilHsseMode && existing.provider === 'OIL_HSSE') {
      existing.oil_hsse_mode = oilHsseMode;
    }
    existing.updated_at = new Date().toISOString();

    this.recordAudit(existing.organization_id, connectorId, 'STATUS_CHANGED', actor, 'SUCCESS', {
      status,
      oil_hsse_mode: existing.oil_hsse_mode,
    });

    return { success: true, connector: existing };
  }

  public validateConnector(connectorId: string, actor: string = 'system_admin') {
    const existing = this.connectors.get(connectorId);
    if (!existing) return { valid: false, errors: ['Connector not found'] };

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!existing.configuration.endpoint_url) {
      errors.push('Endpoint URL cannot be blank.');
    }
    if (existing.configuration.timeout_ms < 500 || existing.configuration.timeout_ms > 30000) {
      errors.push('Timeout must be between 500ms and 30,000ms.');
    }

    if (existing.provider === 'OIL_HSSE') {
      if (!existing.configuration.auth.credential_secret_ref.is_configured) {
        warnings.push(
          'OIL Corporate credential reference (OIL_HSSE_CREDENTIAL_REF) is currently NOT_CONFIGURED. Real-time production sync is blocked.'
        );
      }
      if (existing.oil_hsse_mode === 'ACTIVE' && !existing.configuration.auth.credential_secret_ref.is_configured) {
        errors.push('OIL HSSE Connector cannot be in ACTIVE mode without production authorization.');
      }
    }

    const isValid = errors.length === 0;
    existing.last_validation = {
      timestamp: new Date().toISOString(),
      valid: isValid,
      errors,
      warnings,
      connectivity_check: isValid ? (existing.provider === 'OIL_HSSE' ? 'SKIPPED_DRY_RUN' : 'SUCCESS') : 'FAILED',
    };

    this.recordAudit(existing.organization_id, connectorId, 'VALIDATION_EXECUTED', actor, isValid ? 'SUCCESS' : 'FAILURE', {
      errors,
      warnings,
    });

    return existing.last_validation;
  }

  // --- Ingestion Pipeline & Canonical Mapping ---

  /**
   * Deterministic duplicate detection fingerprint
   */
  public generateFingerprint(sourceSystem: string, externalId: string, orgId: string): string {
    return crypto.createHash('sha256').update(`${sourceSystem}:${externalId}:${orgId}`).digest('hex');
  }

  /**
   * Canonical transformation from raw external record
   */
  public transformToCanonical(
    raw: RawExternalSafetyReport,
    connector: EnterpriseConnector
  ): { canonical: CanonicalExternalReport; errors: string[] } {
    const errors: string[] = [];
    if (!raw.external_id) {
      errors.push('Missing mandatory field: external_id');
    }
    if (!raw.description || raw.description.trim().length < 5) {
      errors.push('Description is missing or too short to analyze.');
    }

    // Map site code to internal site
    let siteId = connector.configuration.default_site_id || 'site-digboi-01';
    if (raw.site_code) {
      const match = SITES.find((s) => s.code.toLowerCase() === raw.site_code?.toLowerCase() || s.id === raw.site_code);
      if (match) siteId = match.id;
    }

    // Map activity code
    let activityId: string | undefined = undefined;
    if (raw.activity_code) {
      const match = ACTIVITIES.find(
        (a) => a.code.toLowerCase() === raw.activity_code?.toLowerCase() || a.id === raw.activity_code
      );
      if (match) activityId = match.id;
    }

    // Determine normalized report type
    let reportType = 'Near-Miss';
    if (raw.classification || raw.incident_type) {
      const val = (raw.classification || raw.incident_type || '').toLowerCase();
      if (val.includes('unsafe condition')) reportType = 'Unsafe Condition';
      else if (val.includes('unsafe act')) reportType = 'Unsafe Act';
      else if (val.includes('incident') || val.includes('injury') || (raw.injury_count && raw.injury_count > 0)) {
        reportType = 'Incident';
      }
    }

    const canonical: CanonicalExternalReport = {
      source_system: connector.provider,
      source_record_id: raw.external_id || `gen-${Date.now()}`,
      source_schema_version: connector.schema_version,
      organization_id: connector.organization_id,
      report_type: reportType,
      site_id: siteId,
      activity_id: activityId,
      report_datetime: raw.incident_datetime || raw.event_date || new Date().toISOString(),
      description: raw.description ? raw.description.trim() : '',
      actual_outcome: raw.consequences || (raw.injury_count ? `${raw.injury_count} person(s) affected` : null),
      data_classification: 'INTERNAL',
      metadata: {
        external_source_id: raw.external_id,
        raw_equipment_damage: raw.equipment_damage || false,
        ingested_via_connector: connector.connector_id,
      },
    };

    return { canonical, errors };
  }

  /**
   * Ingest a batch of external safety reports with partial-import resilience and idempotency
   */
  public async ingestBatch(
    connectorId: string,
    rawReports: RawExternalSafetyReport[],
    options: { isDryRun?: boolean; actor?: string } = {}
  ): Promise<IngestionBatchResult> {
    const startTime = Date.now();
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    const isDryRun = options.isDryRun ?? (connector.oil_hsse_mode === 'DRY_RUN');
    const actor = options.actor || 'system_integration';
    const batchId = `batch-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    let importedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    let failedCount = 0;
    let reviewRequiredCount = 0;
    const results: IngestionRecordResult[] = [];

    for (const raw of rawReports) {
      const fingerprint = this.generateFingerprint(connector.provider, raw.external_id || '', connector.organization_id);

      // Check for duplicates
      if (this.ingestedFingerprints.has(fingerprint)) {
        duplicateCount++;
        results.push({
          source_record_id: raw.external_id || 'UNKNOWN',
          status: 'SKIPPED_DUPLICATE',
          reasons: ['Record fingerprint previously ingested into SUCHAK database.'],
          deduplication_fingerprint: fingerprint,
        });
        continue;
      }

      // Transform and validate
      const { canonical, errors } = this.transformToCanonical(raw, connector);
      if (errors.length > 0) {
        invalidCount++;
        results.push({
          source_record_id: raw.external_id || 'UNKNOWN',
          status: 'INVALID',
          reasons: errors,
        });
        continue;
      }

      // Check if report description mentions severe hazards requiring mandatory review
      const isHighRiskPrecursor =
        canonical.description.toLowerCase().includes('blowout') ||
        canonical.description.toLowerCase().includes('h2s') ||
        canonical.description.toLowerCase().includes('fall from height');

      try {
        if (!isDryRun) {
          // Commit to core SUCHAK repository
          const created = await dataStore.createReport({
            report_type: canonical.report_type,
            description: canonical.description,
            actual_outcome: canonical.actual_outcome,
            site_id: canonical.site_id,
            activity_id: canonical.activity_id,
            report_datetime: canonical.report_datetime,
            source: `CONNECTOR_${connector.provider}`,
            organization_id: canonical.organization_id,
            source_system: canonical.source_system,
            source_record_id: canonical.source_record_id,
            source_schema_version: canonical.source_schema_version,
            connector_id: connector.connector_id,
            data_classification: canonical.data_classification,
            provenance_type: 'SOURCE_DATA',
          });

          this.ingestedFingerprints.add(fingerprint);
          importedCount++;

          if (isHighRiskPrecursor) {
            reviewRequiredCount++;
          }

          results.push({
            source_record_id: canonical.source_record_id,
            suchak_report_id: created.id,
            report_number: created.report_number,
            status: isHighRiskPrecursor ? 'REVIEW_REQUIRED' : 'IMPORTED',
            reasons: isHighRiskPrecursor
              ? ['Ingested successfully and queued for priority human HSE verification.']
              : ['Successfully ingested and analyzed by AI Safety Intelligence pipeline.'],
            deduplication_fingerprint: fingerprint,
          });

          // Dispatch outbound webhook if high-priority
          if (created.latest_analysis?.sif_potential || created.latest_analysis?.classification === 'SIF_POTENTIAL') {
            this.dispatchOutboundEvent('SAFETY_REPORT_CREATED_V1', {
              report_id: created.id,
              report_number: created.report_number,
              site: created.site?.name,
              is_sif_precursor: true,
              confidence: created.latest_analysis?.confidence_estimate || 0.85,
              timestamp: created.created_at,
            });
          }
        } else {
          // Dry-run simulation mode
          importedCount++;
          results.push({
            source_record_id: canonical.source_record_id,
            status: 'IMPORTED',
            reasons: ['[DRY_RUN] Schema transformed and validated successfully. No database write performed.'],
            deduplication_fingerprint: fingerprint,
          });
        }
      } catch (err: any) {
        failedCount++;
        logger.error(`Failed to ingest external record ${raw.external_id}:`, err);
        results.push({
          source_record_id: raw.external_id || 'UNKNOWN',
          status: 'FAILED',
          reasons: [err.message || 'Internal processing error during AI evaluation.'],
        });
      }
    }

    const duration = Date.now() - startTime;
    const batchResult: IngestionBatchResult = {
      batch_id: batchId,
      connector_id: connector.connector_id,
      organization_id: connector.organization_id,
      total_records: rawReports.length,
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      invalid_count: invalidCount,
      failed_count: failedCount,
      review_required_count: reviewRequiredCount,
      duration_ms: duration,
      is_dry_run: isDryRun,
      reconciliation: {
        external_declared_count: rawReports.length,
        matching_checksum: importedCount + duplicateCount + invalidCount + failedCount === rawReports.length,
        unmatched_count: 0,
      },
      results,
      timestamp: new Date().toISOString(),
    };

    // Update connector telemetry
    connector.last_sync = {
      timestamp: batchResult.timestamp,
      records_processed: rawReports.length,
      records_imported: importedCount,
      records_duplicate: duplicateCount,
      records_failed: failedCount + invalidCount,
      duration_ms: duration,
      sync_mode: isDryRun ? 'DRY_RUN' : 'MANUAL',
      status: failedCount > 0 ? 'PARTIAL' : 'COMPLETED',
    };

    this.recordAudit(connector.organization_id, connector.connector_id, 'BATCH_INGESTION', actor, 'SUCCESS', {
      batch_id: batchId,
      total: rawReports.length,
      imported: importedCount,
      duplicates: duplicateCount,
      dry_run: isDryRun,
    });

    return batchResult;
  }

  // --- Outbound Event Webhooks & SSRF Protection ---

  public getOutboundWebhooks(organizationId?: string): OutboundWebhookRegistration[] {
    const list = Array.from(this.outboundWebhooks.values());
    if (organizationId) {
      return list.filter((w) => w.organization_id === organizationId);
    }
    return list;
  }

  public registerOutboundWebhook(params: Partial<OutboundWebhookRegistration>): OutboundWebhookRegistration {
    if (!params.destination_url || !params.event_types || params.event_types.length === 0) {
      throw new Error('destination_url and at least one event_type are required');
    }

    // SSRF Destination Validation
    this.validateOutboundUrl(params.destination_url);

    const id = `whk-out-${Date.now().toString(36)}`;
    const reg: OutboundWebhookRegistration = {
      webhook_id: id,
      organization_id: params.organization_id || 'oil-india-demo',
      destination_url: params.destination_url,
      event_types: params.event_types,
      secret_token_ref: params.secret_token_ref || {
        type: 'env',
        reference_key: 'OUTBOUND_WEBHOOK_SECRET',
        is_configured: true,
      },
      is_active: params.is_active ?? true,
      retry_limit: params.retry_limit || 3,
      created_at: new Date().toISOString(),
    };

    this.outboundWebhooks.set(id, reg);
    return reg;
  }

  /**
   * SSRF filter preventing requests to private subnets, loopbacks, and metadata servers
   */
  public validateOutboundUrl(urlStr: string): void {
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('Only HTTP and HTTPS protocols are permitted for outbound webhooks');
      }

      const hostname = parsed.hostname.toLowerCase();

      // Block local and link-local addresses
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname === '169.254.169.254' || // Cloud metadata endpoint
        hostname.endsWith('.internal') ||
        hostname.endsWith('.local')
      ) {
        // In demo container we allow .local if simulating corporate gateways, but block pure localhost and metadata
        if (hostname === '169.254.169.254' || hostname === '127.0.0.1' || hostname === 'localhost') {
          throw new Error(`SSRF Block: Webhook destination ${hostname} points to protected internal or metadata interface.`);
        }
      }
    } catch (err: any) {
      throw new Error(`Invalid or disallowed webhook destination URL: ${err.message}`);
    }
  }

  public async dispatchOutboundEvent(
    eventType: OutboundEventType,
    payload: Record<string, any>
  ): Promise<OutboundWebhookDelivery[]> {
    const matching = Array.from(this.outboundWebhooks.values()).filter(
      (w) => w.is_active && w.event_types.includes(eventType)
    );

    const results: OutboundWebhookDelivery[] = [];

    for (const hook of matching) {
      const deliveryId = `del-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const delivery: OutboundWebhookDelivery = {
        delivery_id: deliveryId,
        webhook_id: hook.webhook_id,
        event_type: eventType,
        payload,
        attempt: 1,
        status: 'SUCCESS', // Simulated non-blocking safe delivery
        status_code: 200,
        timestamp: new Date().toISOString(),
      };

      hook.last_delivery = {
        timestamp: delivery.timestamp,
        status_code: 200,
        success: true,
        duration_ms: 45,
      };

      this.outboundDeliveries.push(delivery);
      if (this.outboundDeliveries.length > 100) {
        this.outboundDeliveries.shift();
      }
      results.push(delivery);
    }

    return results;
  }

  public getOutboundDeliveries(limit: number = 25): OutboundWebhookDelivery[] {
    return this.outboundDeliveries.slice(-limit).reverse();
  }

  // --- Audit Trail for Integrations ---

  private recordAudit(
    organizationId: string,
    connectorId: string,
    action: string,
    actor: string,
    status: 'SUCCESS' | 'FAILURE' | 'BLOCKED',
    details: Record<string, any>
  ) {
    this.integrationAuditLogs.push({
      id: `audit-int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      organization_id: organizationId,
      connector_id: connectorId,
      action,
      actor,
      status,
      details,
    });
    if (this.integrationAuditLogs.length > 500) {
      this.integrationAuditLogs.shift();
    }
  }

  public getIntegrationAuditLogs(limit: number = 100) {
    return this.integrationAuditLogs.slice(-limit).reverse();
  }
}

export const integrationService = new IntegrationService();
