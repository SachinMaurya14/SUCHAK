import {
  Alert,
  AlertRule,
  AlertStatus,
  AlertSeverity,
  AlertCategory,
  AlertEventType,
  AlertSourceType,
  DomainEvent,
  AlertMetrics,
  AlertListQuery,
  AlertActor,
  UserNotificationPreferences,
  OrganizationAlertPolicy,
  NotificationOutboxItem,
  AlertAuditRecord,
} from './alertTypes.ts';

class AlertStore {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private outbox: Map<string, NotificationOutboxItem> = new Map();
  private auditRecords: AlertAuditRecord[] = [];
  private userPreferences: Map<string, UserNotificationPreferences> = new Map();
  private orgPolicies: Map<string, OrganizationAlertPolicy> = new Map();

  // Deduplication cache: dedupe_key -> last triggered timestamp (ms)
  private dedupeCache: Map<string, number> = new Map();

  constructor() {
    this.seedDefaultRules();
    this.seedDefaultPolicies();
    this.seedDemonstrationAlerts();
  }

  // ==========================================
  // RULE MANAGEMENT & SEEDING
  // ==========================================

  private seedDefaultRules() {
    const defaultOrg = 'oil-india-demo';
    const now = new Date().toISOString();

    const initialRules: AlertRule[] = [
      {
        id: 'RULE-REV-01',
        organization_id: defaultOrg,
        name: 'Report Requires Human HSE Review',
        description: 'Triggered when a newly evaluated report meets review eligibility criteria or contains SIF potential.',
        event_type: 'REVIEW_REQUIRED',
        category: 'REVIEW',
        enabled: true,
        severity: 'WARNING',
        channels: ['IN_APP', 'EMAIL'],
        conditions: { min_risk_level: 'MEDIUM' },
        cooldown_seconds: 3600, // 1 hour
        escalation_policy: {
          enabled: true,
          levels: [
            { level: 1, delay_hours: 0, target_role: 'SafetyReviewer', channel: 'IN_APP', description: 'Assigned to qualified HSE Reviewer' },
            { level: 2, delay_hours: 24, target_role: 'HSEOfficer', channel: 'EMAIL', description: 'Escalated if unreviewed for 24 hours' },
          ],
        },
        version: 1,
        effective_from: now,
        created_by: 'System Bootstrap',
        updated_by: 'System Bootstrap',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'RULE-REV-02',
        organization_id: defaultOrg,
        name: 'Review Stale Due to Analysis Version Update',
        description: 'Triggered when source safety report AI re-evaluation invalidates previously completed review.',
        event_type: 'REVIEW_STALE',
        category: 'REVIEW',
        enabled: true,
        severity: 'NOTICE',
        channels: ['IN_APP'],
        conditions: { stale_days_threshold: 1 },
        cooldown_seconds: 7200,
        escalation_policy: { enabled: false, levels: [] },
        version: 1,
        effective_from: now,
        created_by: 'System Bootstrap',
        updated_by: 'System Bootstrap',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'RULE-CRIT-01',
        organization_id: defaultOrg,
        name: 'Critical-Priority SIF Precursor Review',
        description: 'Immediate workflow alert for reports scored as CRITICAL risk priority requiring immediate operational review.',
        event_type: 'CRITICAL_REPORT_REVIEW',
        category: 'RISK',
        enabled: true,
        severity: 'CRITICAL',
        channels: ['IN_APP', 'EMAIL', 'WEBHOOK'],
        conditions: { min_risk_level: 'CRITICAL', sif_precursor_only: true },
        cooldown_seconds: 1800, // 30 mins
        escalation_policy: {
          enabled: true,
          levels: [
            { level: 1, delay_hours: 0, target_role: 'HSEOfficer', channel: 'IN_APP', description: 'Immediate notification to Asset HSE Lead' },
            { level: 2, delay_hours: 4, target_role: 'OrgAdmin', channel: 'EMAIL', description: 'Escalation to Corporate Safety Director' },
          ],
        },
        version: 1,
        effective_from: now,
        created_by: 'System Bootstrap',
        updated_by: 'System Bootstrap',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'RULE-PAT-01',
        organization_id: defaultOrg,
        name: 'Emerging Precursor Pattern Detected',
        description: 'Phase 8 Discovery engine flagged a newly formed recurring precursor pattern across drilling/production sites.',
        event_type: 'PATTERN_EMERGING',
        category: 'PATTERN',
        enabled: true,
        severity: 'HIGH',
        channels: ['IN_APP', 'EMAIL'],
        conditions: { pattern_support_threshold: 3 },
        cooldown_seconds: 86400, // 24 hours
        escalation_policy: {
          enabled: true,
          levels: [
            { level: 1, delay_hours: 0, target_role: 'HSEOfficer', channel: 'IN_APP', description: 'Notified to Enterprise HSE Committee' },
          ],
        },
        version: 1,
        effective_from: now,
        created_by: 'System Bootstrap',
        updated_by: 'System Bootstrap',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'RULE-PAT-02',
        organization_id: defaultOrg,
        name: 'Persistent Precursor Pattern Active',
        description: 'Pattern shows ongoing repeat occurrences spanning multiple operational reporting periods.',
        event_type: 'PATTERN_PERSISTENT',
        category: 'PATTERN',
        enabled: true,
        severity: 'WARNING',
        channels: ['IN_APP'],
        conditions: { pattern_support_threshold: 5 },
        cooldown_seconds: 86400,
        escalation_policy: { enabled: false, levels: [] },
        version: 1,
        effective_from: now,
        created_by: 'System Bootstrap',
        updated_by: 'System Bootstrap',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'RULE-ACT-01',
        organization_id: defaultOrg,
        name: 'CAPA Action Past Due Date',
        description: 'Corrective or preventive safety action has surpassed its committed target completion date.',
        event_type: 'ACTION_OVERDUE',
        category: 'ACTION',
        enabled: true,
        severity: 'HIGH',
        channels: ['IN_APP', 'EMAIL'],
        conditions: { overdue_hours_threshold: 0 },
        cooldown_seconds: 43200, // 12 hours
        escalation_policy: {
          enabled: true,
          levels: [
            { level: 1, delay_hours: 0, target_role: 'SiteManager', channel: 'IN_APP', description: 'Remind Action Assignee & Site Manager' },
            { level: 2, delay_hours: 48, target_role: 'HSEOfficer', channel: 'EMAIL', description: 'Escalate to Area HSE Superintendent' },
            { level: 3, delay_hours: 96, target_role: 'OrgAdmin', channel: 'EMAIL', description: 'Executive Safety Committee Non-Conformance Log' },
          ],
        },
        version: 1,
        effective_from: now,
        created_by: 'System Bootstrap',
        updated_by: 'System Bootstrap',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'RULE-ACT-02',
        organization_id: defaultOrg,
        name: 'Action Awaiting Field Verification',
        description: 'Completed CAPA action requires independent physical verification by certified safety reviewer before closure.',
        event_type: 'ACTION_VERIFICATION_REQUIRED',
        category: 'ACTION',
        enabled: true,
        severity: 'NOTICE',
        channels: ['IN_APP'],
        conditions: {},
        cooldown_seconds: 14400,
        escalation_policy: { enabled: false, levels: [] },
        version: 1,
        effective_from: now,
        created_by: 'System Bootstrap',
        updated_by: 'System Bootstrap',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'RULE-ACT-03',
        organization_id: defaultOrg,
        name: 'Field Verification Rejected / Failed',
        description: 'Verifier did not sign off on action completion due to deficient physical barrier evidence or non-compliance.',
        event_type: 'ACTION_VERIFICATION_FAILED',
        category: 'ACTION',
        enabled: true,
        severity: 'HIGH',
        channels: ['IN_APP', 'EMAIL'],
        conditions: {},
        cooldown_seconds: 7200,
        escalation_policy: {
          enabled: true,
          levels: [
            { level: 1, delay_hours: 0, target_role: 'SiteManager', channel: 'IN_APP', description: 'Notify action owner to execute required rework' },
          ],
        },
        version: 1,
        effective_from: now,
        created_by: 'System Bootstrap',
        updated_by: 'System Bootstrap',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'RULE-ACT-04',
        organization_id: defaultOrg,
        name: 'Closed Action Reopened',
        description: 'Previously closed CAPA action was reopened due to recurring barrier failure or audit inspection finding.',
        event_type: 'ACTION_REOPENED',
        category: 'ACTION',
        enabled: true,
        severity: 'WARNING',
        channels: ['IN_APP'],
        conditions: {},
        cooldown_seconds: 7200,
        escalation_policy: { enabled: false, levels: [] },
        version: 1,
        effective_from: now,
        created_by: 'System Bootstrap',
        updated_by: 'System Bootstrap',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'RULE-SYS-01',
        organization_id: defaultOrg,
        name: 'AI Analysis or Indexing Operation Failed',
        description: 'Background vector indexing or model inference pipeline encountered an unhandled execution failure.',
        event_type: 'SYSTEM_PROCESSING_FAILED',
        category: 'SYSTEM',
        enabled: true,
        severity: 'HIGH',
        channels: ['IN_APP', 'WEBHOOK'],
        conditions: {},
        cooldown_seconds: 1800,
        escalation_policy: {
          enabled: true,
          levels: [
            { level: 1, delay_hours: 0, target_role: 'OrgAdmin', channel: 'IN_APP', description: 'Alert platform administrator for diagnostics' },
          ],
        },
        version: 1,
        effective_from: now,
        created_by: 'System Bootstrap',
        updated_by: 'System Bootstrap',
        created_at: now,
        updated_at: now,
      },
    ];

    for (const rule of initialRules) {
      this.rules.set(rule.id, rule);
    }
  }

  private seedDefaultPolicies() {
    const orgId = 'oil-india-demo';
    const now = new Date().toISOString();

    this.orgPolicies.set(orgId, {
      organization_id: orgId,
      policy_version: 1,
      alerts_globally_enabled: true,
      default_cooldown_seconds: 3600,
      retention_days: 90,
      channels_enabled: {
        IN_APP: true,
        EMAIL: true,
        WEBHOOK: true,
      },
      webhook_config: {
        endpoint_url: 'https://security.oil-india.internal/hsse/webhooks/alerts',
        secret_configured: true,
        allowed_events: [
          'CRITICAL_REPORT_REVIEW',
          'PATTERN_EMERGING',
          'ACTION_OVERDUE',
          'SYSTEM_PROCESSING_FAILED',
        ],
        enabled: true,
      },
      email_config: {
        sender_address: 'suchak-alerts@oil-india.in',
        provider_mode: 'SIMULATED',
        enabled: true,
      },
      updated_at: now,
    });
  }

  private seedDemonstrationAlerts() {
    const orgId = 'oil-india-demo';
    const now = Date.now();

    const sampleAlerts: Alert[] = [
      {
        id: 'ALT-2026-000101',
        organization_id: orgId,
        rule_id: 'RULE-ACT-01',
        rule_name: 'CAPA Action Past Due Date',
        rule_version: 1,
        event_type: 'ACTION_OVERDUE',
        category: 'ACTION',
        severity: 'HIGH',
        title: 'Action ACT-2026-000304 is Overdue by 1 Day',
        message: 'Replace Corroded Pipe Flange Isolation Gasket on Moran separator outlet line was scheduled for completion on 18 Sep 2026 and remains uncompleted.',
        status: 'UNREAD',
        source_type: 'ACTION',
        source_id: 'act-seed-304',
        source_number: 'ACT-2026-000304',
        source_url: '/actions',
        target_role: 'SiteManager',
        target_user_name: 'Manish Chhetri',
        target_site_id: 'site-moran-02',
        target_site_name: 'Moran Drilling Site A [SYNTHETIC DEMO]',
        dedupe_key: `${orgId}:RULE-ACT-01:ACTION_OVERDUE:act-seed-304:SiteManager`,
        why_triggered: {
          rule_matched: 'RULE-ACT-01 (CAPA Action Past Due Date)',
          event_received: 'ACTION_OVERDUE',
          deterministic_evidence: 'Action status is ASSIGNED with progress 0% and due_at timestamp (2026-09-18) is prior to current UTC evaluation time.',
          evaluated_conditions: {
            overdue_hours_threshold: 0,
            actual_overdue_hours: 24,
            current_status: 'ASSIGNED',
          },
        },
        source_context: {
          title: 'Replace Corroded Pipe Flange Isolation Gasket on Low-Pressure Flare Line',
          site_name: 'Moran Drilling Site A [SYNTHETIC DEMO]',
          activity_name: 'Production Operations & Pumping',
          due_at: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
          overdue_days: 1,
        },
        escalation_level: 1,
        escalation_history: [
          {
            level: 1,
            previous_level: 0,
            escalated_to_role: 'SiteManager',
            reason: 'Automated initial reminder sent upon passing target deadline.',
            timestamp: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
          },
        ],
        created_at: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ALT-2026-000102',
        organization_id: orgId,
        rule_id: 'RULE-CRIT-01',
        rule_name: 'Critical-Priority SIF Precursor Review',
        rule_version: 1,
        event_type: 'CRITICAL_REPORT_REVIEW',
        category: 'RISK',
        severity: 'CRITICAL',
        title: 'Immediate Review Required: Critical SIF Precursor (REP-2026-0895)',
        message: 'High-pressure mud pump discharge manifold connection flapped during test without safety whip check. Scored as CRITICAL risk priority.',
        status: 'UNREAD',
        source_type: 'REPORT',
        source_id: 'REP-2026-0895',
        source_number: 'REP-2026-0895',
        source_url: '/reports/REP-2026-0895',
        target_role: 'HSEOfficer',
        target_site_id: 'site-digboi-01',
        target_site_name: 'Digboi Central Rig #4 [SYNTHETIC DEMO]',
        dedupe_key: `${orgId}:RULE-CRIT-01:CRITICAL_REPORT_REVIEW:REP-2026-0895:HSEOfficer`,
        why_triggered: {
          rule_matched: 'RULE-CRIT-01 (Critical-Priority SIF Precursor Review)',
          event_received: 'CRITICAL_REPORT_REVIEW',
          deterministic_evidence: 'Safety report analysis computed risk priority CRITICAL (Risk Score 88/100) with positive SIF Precursor potential and review_status UNREVIEWED.',
          evaluated_conditions: {
            min_risk_level: 'CRITICAL',
            sif_precursor_only: true,
            current_risk_priority: 'CRITICAL',
            review_status: 'UNREVIEWED',
          },
        },
        source_context: {
          title: 'High-pressure mud pump discharge line whip check unlatched',
          site_name: 'Digboi Central Rig #4 [SYNTHETIC DEMO]',
          activity_name: 'High-Pressure Pumping & Testing',
          risk_level: 'CRITICAL',
          sif_potential: true,
          review_status: 'UNREVIEWED',
        },
        escalation_level: 1,
        escalation_history: [],
        created_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ALT-2026-000103',
        organization_id: orgId,
        rule_id: 'RULE-PAT-01',
        rule_name: 'Emerging Precursor Pattern Detected',
        rule_version: 1,
        event_type: 'PATTERN_EMERGING',
        category: 'PATTERN',
        severity: 'HIGH',
        title: 'Recurring Pattern PAT-2026-001 Detected Across 2 Drilling Sites',
        message: 'Phase 8 Discovery engine identified persistent Line-of-Fire / dropped object precursor reports clustering at Digboi and Moran.',
        status: 'ACKNOWLEDGED',
        source_type: 'PATTERN',
        source_id: 'pat-cluster-001',
        source_number: 'PAT-2026-001',
        source_url: '/patterns',
        target_role: 'HSEOfficer',
        dedupe_key: `${orgId}:RULE-PAT-01:PATTERN_EMERGING:pat-cluster-001:HSEOfficer`,
        why_triggered: {
          rule_matched: 'RULE-PAT-01 (Emerging Precursor Pattern Detected)',
          event_received: 'PATTERN_EMERGING',
          deterministic_evidence: 'Pattern support count reached 5 reports spanning >=2 sites with strength ratio 0.88 exceeding emerging threshold.',
          evaluated_conditions: {
            pattern_support_threshold: 3,
            actual_support_count: 5,
            pattern_strength: 0.88,
          },
        },
        source_context: {
          title: 'Unbarricaded Rig Floor Line-of-Fire during Overhead Crane Hoisting',
          pattern_support_count: 5,
        },
        escalation_level: 1,
        escalation_history: [],
        acknowledged_at: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
        acknowledged_by: {
          id: 'user-priyanka-02',
          name: 'Priyanka Saikia',
          role: 'HSEOfficer',
          note: 'Pattern reviewed. Initiated preventive action ACT-2026-000303 for crane barricade procurement.',
        },
        created_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ALT-2026-000104',
        organization_id: orgId,
        rule_id: 'RULE-ACT-02',
        rule_name: 'Action Awaiting Field Verification',
        rule_version: 1,
        event_type: 'ACTION_VERIFICATION_REQUIRED',
        category: 'ACTION',
        severity: 'NOTICE',
        title: 'Action ACT-2026-000302 Ready for Field Verification',
        message: 'Recalibration of H2S gas detection sensors on Moran Separator completed by contractor. Awaiting sign-off.',
        status: 'READ',
        source_type: 'ACTION',
        source_id: 'act-seed-302',
        source_number: 'ACT-2026-000302',
        source_url: '/actions',
        target_role: 'SafetyReviewer',
        target_site_id: 'site-moran-02',
        target_site_name: 'Moran Drilling Site A [SYNTHETIC DEMO]',
        dedupe_key: `${orgId}:RULE-ACT-02:ACTION_VERIFICATION_REQUIRED:act-seed-302:SafetyReviewer`,
        why_triggered: {
          rule_matched: 'RULE-ACT-02 (Action Awaiting Field Verification)',
          event_received: 'ACTION_VERIFICATION_REQUIRED',
          deterministic_evidence: 'Action status reached COMPLETED with verification_required=true and verification_status=PENDING.',
          evaluated_conditions: {
            verification_required: true,
            verification_status: 'PENDING',
          },
        },
        source_context: {
          title: 'Recalibrate Fixed Lower-Explosive-Limit & H2S Sensors on Separator Skid 2B',
          site_name: 'Moran Drilling Site A [SYNTHETIC DEMO]',
          verification_status: 'PENDING',
        },
        escalation_level: 1,
        escalation_history: [],
        read_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ALT-2026-000105',
        organization_id: orgId,
        rule_id: 'RULE-REV-01',
        rule_name: 'Report Requires Human HSE Review',
        rule_version: 1,
        event_type: 'REVIEW_REQUIRED',
        category: 'REVIEW',
        severity: 'WARNING',
        title: 'HSE Review Pending: Report REP-2026-0891',
        message: 'Near miss regarding portable ladder slippage at Duliajan GGS compressor house requires human confirmation.',
        status: 'RESOLVED',
        source_type: 'REPORT',
        source_id: 'REP-2026-0891',
        source_number: 'REP-2026-0891',
        source_url: '/reports/REP-2026-0891',
        target_role: 'SafetyReviewer',
        target_site_id: 'site-duliajan-03',
        target_site_name: 'Duliajan Gas Gathering Station [SYNTHETIC DEMO]',
        dedupe_key: `${orgId}:RULE-REV-01:REVIEW_REQUIRED:REP-2026-0891:SafetyReviewer`,
        why_triggered: {
          rule_matched: 'RULE-REV-01 (Report Requires Human HSE Review)',
          event_received: 'REVIEW_REQUIRED',
          deterministic_evidence: 'Report analysis completed with high confidence and review eligibility criteria satisfied.',
          evaluated_conditions: {
            review_eligibility: true,
          },
        },
        source_context: {
          title: 'Unsecured extension ladder foot slipped on oily surface',
          site_name: 'Duliajan Gas Gathering Station [SYNTHETIC DEMO]',
          review_status: 'REVIEWED',
        },
        escalation_level: 1,
        escalation_history: [],
        resolved_at: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
        resolved_by: {
          id: 'user-debajit-03',
          name: 'Debajit Bora',
          role: 'SafetyReviewer',
          resolution_note: 'Formal human HSE review completed and logged in Review Register.',
        },
        created_at: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      },
    ];

    for (const alt of sampleAlerts) {
      this.alerts.set(alt.id, alt);
      this.dedupeCache.set(alt.dedupe_key, new Date(alt.created_at).getTime());
    }

    // Seed sample outbox records for delivery tracking
    this.outbox.set('out-101', {
      id: 'out-101',
      organization_id: orgId,
      alert_id: 'ALT-2026-000101',
      channel: 'EMAIL',
      recipient: 'manish.chhetri@oil-india.internal',
      status: 'SENT',
      attempts: 1,
      max_attempts: 3,
      last_attempt_at: new Date(now - 17 * 60 * 60 * 1000).toISOString(),
      payload: { subject: 'Overdue Action Notification: ACT-2026-000304' },
      created_at: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
      sent_at: new Date(now - 17 * 60 * 60 * 1000).toISOString(),
    });

    this.outbox.set('out-102', {
      id: 'out-102',
      organization_id: orgId,
      alert_id: 'ALT-2026-000102',
      channel: 'WEBHOOK',
      recipient: 'https://security.oil-india.internal/hsse/webhooks/alerts',
      status: 'SENT',
      attempts: 1,
      max_attempts: 3,
      last_attempt_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      payload: { event: 'CRITICAL_REPORT_REVIEW', report_id: 'REP-2026-0895' },
      created_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      sent_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    });
  }

  // ==========================================
  // EVENT EVALUATION & ALERT CREATION
  // ==========================================

  public evaluateEvent(event: DomainEvent): Alert[] {
    const createdAlerts: Alert[] = [];
    const policy = this.getOrgPolicy(event.organization_id);

    if (!policy.alerts_globally_enabled) {
      return [];
    }

    // Match enabled rules for this event type
    const matchingRules = Array.from(this.rules.values()).filter(
      (r) => r.organization_id === event.organization_id && r.enabled && r.event_type === event.event_type
    );

    for (const rule of matchingRules) {
      const matchResult = this.evaluateRuleConditions(rule, event);
      if (!matchResult.matches) {
        continue;
      }

      // Deduplication & Cooldown check
      const target = event.actor?.role || rule.escalation_policy.levels[0]?.target_role || 'ALL';
      const dedupeKey = `${event.organization_id}:${rule.id}:${event.event_type}:${event.source_id}:${target}`;
      const now = Date.now();
      const lastTriggered = this.dedupeCache.get(dedupeKey);

      const cooldownMs = (rule.cooldown_seconds || policy.default_cooldown_seconds || 3600) * 1000;
      if (lastTriggered && now - lastTriggered < cooldownMs) {
        // Suppressed under cooldown
        continue;
      }

      const alertId = `ALT-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
      const title = this.buildAlertTitle(rule, event);
      const message = this.buildAlertMessage(rule, event);

      const newAlert: Alert = {
        id: alertId,
        organization_id: event.organization_id,
        rule_id: rule.id,
        rule_name: rule.name,
        rule_version: rule.version,
        event_type: event.event_type,
        category: rule.category,
        severity: rule.severity,
        title,
        message,
        status: 'UNREAD',
        source_type: event.source_type,
        source_id: event.source_id,
        source_number: event.source_number,
        source_url: this.resolveSourceUrl(event.source_type, event.source_id),
        source_version: event.source_version,
        target_role: target,
        target_site_id: event.data.site_id,
        target_site_name: event.data.site_name,
        dedupe_key: dedupeKey,
        cooldown_until: new Date(now + cooldownMs).toISOString(),
        why_triggered: {
          rule_matched: `${rule.id} (${rule.name})`,
          event_received: event.event_type,
          deterministic_evidence: matchResult.evidence,
          evaluated_conditions: matchResult.evaluatedConditions,
        },
        source_context: {
          title: event.data.title || event.data.summary,
          site_name: event.data.site_name,
          location_name: event.data.location_name,
          activity_name: event.data.activity_name,
          risk_level: event.data.risk_level,
          sif_potential: event.data.sif_potential,
          due_at: event.data.due_at,
          overdue_days: event.data.overdue_days,
          pattern_support_count: event.data.pattern_support_count,
          verification_status: event.data.verification_status,
          review_status: event.data.review_status,
        },
        escalation_level: 1,
        escalation_history: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.alerts.set(alertId, newAlert);
      this.dedupeCache.set(dedupeKey, now);

      // Audit creation
      this.recordAudit({
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        organization_id: event.organization_id,
        alert_id: alertId,
        event_name: 'ALERT_CREATED',
        actor: event.actor || { id: 'sys', name: 'Alert Rule Engine', role: 'System' },
        timestamp: newAlert.created_at,
        details: { rule_id: rule.id, event_type: event.event_type, severity: rule.severity },
      });

      // Dispatch to notification channels via Outbox
      this.enqueueOutboxNotifications(newAlert, rule, policy);

      createdAlerts.push(newAlert);
    }

    return createdAlerts;
  }

  private evaluateRuleConditions(rule: AlertRule, event: DomainEvent): {
    matches: boolean;
    evidence: string;
    evaluatedConditions: Record<string, any>;
  } {
    const cond = rule.conditions;
    const data = event.data;

    if (cond.min_risk_level) {
      const riskRanks: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      const eventRisk = data.risk_level || 'LOW';
      if ((riskRanks[eventRisk] || 0) < (riskRanks[cond.min_risk_level] || 0)) {
        return { matches: false, evidence: '', evaluatedConditions: cond };
      }
    }

    if (cond.sif_precursor_only && !data.sif_potential) {
      return { matches: false, evidence: '', evaluatedConditions: cond };
    }

    if (cond.overdue_hours_threshold !== undefined && (data.overdue_hours || 0) < cond.overdue_hours_threshold) {
      return { matches: false, evidence: '', evaluatedConditions: cond };
    }

    if (cond.pattern_support_threshold !== undefined && (data.pattern_support_count || 0) < cond.pattern_support_threshold) {
      return { matches: false, evidence: '', evaluatedConditions: cond };
    }

    let evidence = `Domain event ${event.event_type} from ${event.source_type} #${event.source_number} satisfied operational criteria for Rule ${rule.id}.`;
    if (data.overdue_days !== undefined) {
      evidence += ` Object is overdue by ${data.overdue_days} day(s).`;
    }
    if (data.risk_level) {
      evidence += ` Risk level recorded as ${data.risk_level}.`;
    }

    return {
      matches: true,
      evidence,
      evaluatedConditions: { ...cond, ...data },
    };
  }

  private buildAlertTitle(rule: AlertRule, event: DomainEvent): string {
    switch (event.event_type) {
      case 'ACTION_OVERDUE':
        return `Action ${event.source_number} is Overdue`;
      case 'CRITICAL_REPORT_REVIEW':
        return `Immediate Review Required: Critical SIF Precursor (${event.source_number})`;
      case 'REVIEW_REQUIRED':
        return `HSE Review Pending: Report ${event.source_number}`;
      case 'PATTERN_EMERGING':
        return `Recurring Precursor Pattern ${event.source_number} Detected`;
      case 'ACTION_VERIFICATION_REQUIRED':
        return `Action ${event.source_number} Pending Field Verification`;
      case 'ACTION_VERIFICATION_FAILED':
        return `Action ${event.source_number} Field Verification Rejected`;
      case 'SYSTEM_PROCESSING_FAILED':
        return `System Processing Failure in Pipeline`;
      default:
        return `${rule.name} - ${event.source_number}`;
    }
  }

  private buildAlertMessage(rule: AlertRule, event: DomainEvent): string {
    const summary = event.data.title || event.data.summary || event.data.description || 'Workflow event requiring attention.';
    const site = event.data.site_name ? ` at ${event.data.site_name}` : '';
    return `${summary}${site}`;
  }

  private resolveSourceUrl(sourceType: AlertSourceType, sourceId: string): string {
    switch (sourceType) {
      case 'REPORT':
        return `/reports/${sourceId}`;
      case 'REVIEW':
        return `/reviews`;
      case 'PATTERN':
        return `/patterns`;
      case 'ACTION':
        return `/actions`;
      case 'RISK_ASSESSMENT':
        return `/reports/${sourceId}`;
      default:
        return `/dashboard`;
    }
  }

  private enqueueOutboxNotifications(alert: Alert, rule: AlertRule, policy: OrganizationAlertPolicy) {
    const now = new Date().toISOString();

    for (const channel of rule.channels) {
      if (!policy.channels_enabled[channel]) continue;

      const outboxId = `out-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let recipient = 'in-app-subscribers';
      if (channel === 'EMAIL') {
        recipient = 'hse-superintendent@oil-india.in';
      } else if (channel === 'WEBHOOK') {
        recipient = policy.webhook_config?.endpoint_url || 'https://security.oil-india.internal/hsse/webhooks';
      }

      this.outbox.set(outboxId, {
        id: outboxId,
        organization_id: alert.organization_id,
        alert_id: alert.id,
        channel,
        recipient,
        status: channel === 'IN_APP' ? 'SENT' : 'PENDING',
        attempts: channel === 'IN_APP' ? 1 : 0,
        max_attempts: 3,
        payload: {
          alert_id: alert.id,
          title: alert.title,
          severity: alert.severity,
          source_type: alert.source_type,
          source_number: alert.source_number,
        },
        created_at: now,
        sent_at: channel === 'IN_APP' ? now : undefined,
      });
    }
  }

  // ==========================================
  // OUTBOX PROCESSING (RELIABLE DISPATCH)
  // ==========================================

  public processPendingOutbox(): { processed: number; sent: number; failed: number } {
    let processed = 0;
    let sent = 0;
    let failed = 0;

    const pending = Array.from(this.outbox.values()).filter(
      (item) => item.status === 'PENDING' || item.status === 'RETRYING'
    );

    for (const item of pending) {
      processed++;
      item.attempts++;
      item.last_attempt_at = new Date().toISOString();

      try {
        // Safe decoupled dispatch simulation (never blocks core workflow or leaks secrets)
        if (item.channel === 'EMAIL') {
          // Simulated enterprise SMTP relay
          item.status = 'SENT';
          item.sent_at = new Date().toISOString();
          sent++;
        } else if (item.channel === 'WEBHOOK') {
          // Simulated signed enterprise webhook delivery (HMAC-SHA256 authenticated)
          item.status = 'SENT';
          item.sent_at = new Date().toISOString();
          sent++;
        }
      } catch (err: any) {
        if (item.attempts >= item.max_attempts) {
          item.status = 'FAILED';
          item.error_message = `Max retry limit reached (3): ${err.message || 'Dispatch timeout'}`;
          failed++;
        } else {
          item.status = 'RETRYING';
          item.error_message = err.message || 'Transient network error';
        }
      }
    }

    return { processed, sent, failed };
  }

  // ==========================================
  // ALERT LIFECYCLE & STATE MACHINE
  // ==========================================

  public getAlert(id: string, organizationId: string): Alert | null {
    const alert = this.alerts.get(id);
    if (!alert || alert.organization_id !== organizationId) {
      return null;
    }
    return alert;
  }

  public listAlerts(query: AlertListQuery): {
    items: Alert[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  } {
    const orgId = query.organization_id || 'oil-india-demo';
    let results = Array.from(this.alerts.values()).filter((a) => a.organization_id === orgId);

    if (query.severity) {
      results = results.filter((a) => a.severity === query.severity);
    }

    if (query.status) {
      results = results.filter((a) => a.status === query.status);
    }

    if (query.category) {
      results = results.filter((a) => a.category === query.category);
    }

    if (query.event_type) {
      results = results.filter((a) => a.event_type === query.event_type);
    }

    if (query.source_type) {
      results = results.filter((a) => a.source_type === query.source_type);
    }

    if (query.site_id) {
      results = results.filter((a) => a.target_site_id === query.site_id);
    }

    if (query.unread_only) {
      results = results.filter((a) => a.status === 'UNREAD');
    }

    if (query.search) {
      const q = query.search.toLowerCase();
      results = results.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q) ||
          a.source_number.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
      );
    }

    // Sort
    const sortField = query.sort_by || 'created_at';
    const sortDir = query.sort_dir || 'desc';

    results.sort((a, b) => {
      let valA: any = a.created_at;
      let valB: any = b.created_at;

      if (sortField === 'severity') {
        const severityRank: Record<AlertSeverity, number> = {
          CRITICAL: 5,
          HIGH: 4,
          WARNING: 3,
          NOTICE: 2,
          INFO: 1,
        };
        valA = severityRank[a.severity] || 0;
        valB = severityRank[b.severity] || 0;
      } else if (sortField === 'status') {
        valA = a.status;
        valB = b.status;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const total = results.length;
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.page_size || 15));
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const items = results.slice(startIndex, startIndex + pageSize);

    return {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
  }

  public markAsRead(id: string, organizationId: string, actor: AlertActor): Alert {
    const alert = this.getAlert(id, organizationId);
    if (!alert) throw new Error(`Alert ${id} not found`);

    if (alert.status === 'UNREAD') {
      alert.status = 'READ';
      alert.read_at = new Date().toISOString();
      alert.updated_at = alert.read_at;

      this.recordAudit({
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        organization_id: organizationId,
        alert_id: id,
        event_name: 'ALERT_READ',
        actor,
        timestamp: alert.read_at,
        details: { previous_status: 'UNREAD', new_status: 'READ' },
      });
    }

    return alert;
  }

  public acknowledgeAlert(id: string, organizationId: string, actor: AlertActor, note?: string): Alert {
    const alert = this.getAlert(id, organizationId);
    if (!alert) throw new Error(`Alert ${id} not found`);

    if (alert.status === 'RESOLVED' || alert.status === 'DISMISSED') {
      throw new Error(`Cannot acknowledge an alert in ${alert.status} state.`);
    }

    const now = new Date().toISOString();
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledged_at = now;
    alert.acknowledged_by = {
      id: actor.id,
      name: actor.name,
      role: actor.role,
      note: note || undefined,
    };
    alert.updated_at = now;

    this.recordAudit({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organization_id: organizationId,
      alert_id: id,
      event_name: 'ALERT_ACKNOWLEDGED',
      actor,
      timestamp: now,
      details: { note: note || 'Acknowledged by user' },
    });

    return alert;
  }

  public dismissAlert(id: string, organizationId: string, actor: AlertActor, reason: string): Alert {
    const alert = this.getAlert(id, organizationId);
    if (!alert) throw new Error(`Alert ${id} not found`);

    if (!reason || !reason.trim()) {
      throw new Error('A documented reason is required to dismiss this alert.');
    }

    const now = new Date().toISOString();
    alert.status = 'DISMISSED';
    alert.dismissed_at = now;
    alert.dismissed_by = {
      id: actor.id,
      name: actor.name,
      role: actor.role,
      reason: reason.trim(),
    };
    alert.updated_at = now;

    this.recordAudit({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organization_id: organizationId,
      alert_id: id,
      event_name: 'ALERT_DISMISSED',
      actor,
      timestamp: now,
      details: { dismissal_reason: reason.trim() },
    });

    return alert;
  }

  public resolveAlert(id: string, organizationId: string, actor: AlertActor, resolutionNote: string): Alert {
    const alert = this.getAlert(id, organizationId);
    if (!alert) throw new Error(`Alert ${id} not found`);

    const now = new Date().toISOString();
    alert.status = 'RESOLVED';
    alert.resolved_at = now;
    alert.resolved_by = {
      id: actor.id,
      name: actor.name,
      role: actor.role,
      resolution_note: resolutionNote || 'Resolved following operational review.',
    };
    alert.updated_at = now;

    this.recordAudit({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organization_id: organizationId,
      alert_id: id,
      event_name: 'ALERT_RESOLVED',
      actor,
      timestamp: now,
      details: { resolution_note: resolutionNote },
    });

    return alert;
  }

  public escalateAlert(
    id: string,
    organizationId: string,
    actor: AlertActor,
    reason: string,
    targetRole?: string
  ): Alert {
    const alert = this.getAlert(id, organizationId);
    if (!alert) throw new Error(`Alert ${id} not found`);

    const rule = this.rules.get(alert.rule_id);
    const nextLevel = alert.escalation_level + 1;
    const target = targetRole || (rule?.escalation_policy.levels[nextLevel - 1]?.target_role) || 'OrgAdmin';
    const now = new Date().toISOString();

    const escalationItem = {
      level: nextLevel,
      previous_level: alert.escalation_level,
      escalated_to_role: target,
      reason: reason || 'Manual user escalation to higher authority tier.',
      timestamp: now,
    };

    alert.escalation_level = nextLevel;
    alert.escalation_history.push(escalationItem);
    alert.target_role = target;
    alert.updated_at = now;

    this.recordAudit({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organization_id: organizationId,
      alert_id: id,
      event_name: 'ALERT_ESCALATED',
      actor,
      timestamp: now,
      details: escalationItem,
    });

    return alert;
  }

  // ==========================================
  // METRICS & OBSERVABILITY
  // ==========================================

  public getMetrics(organizationId: string): AlertMetrics {
    const orgAlerts = Array.from(this.alerts.values()).filter((a) => a.organization_id === organizationId);

    const unread_count = orgAlerts.filter((a) => a.status === 'UNREAD').length;
    const total_active = orgAlerts.filter((a) => a.status === 'UNREAD' || a.status === 'READ' || a.status === 'ACKNOWLEDGED').length;
    const acknowledged_count = orgAlerts.filter((a) => a.status === 'ACKNOWLEDGED').length;
    const resolved_count = orgAlerts.filter((a) => a.status === 'RESOLVED').length;
    const high_or_critical_count = orgAlerts.filter(
      (a) => (a.severity === 'CRITICAL' || a.severity === 'HIGH') && a.status !== 'RESOLVED' && a.status !== 'DISMISSED'
    ).length;

    const overdue_action_alerts = orgAlerts.filter((a) => a.event_type === 'ACTION_OVERDUE' && a.status !== 'RESOLVED').length;
    const review_alerts = orgAlerts.filter((a) => a.category === 'REVIEW' && a.status !== 'RESOLVED').length;
    const pattern_alerts = orgAlerts.filter((a) => a.category === 'PATTERN' && a.status !== 'RESOLVED').length;
    const system_alerts = orgAlerts.filter((a) => a.category === 'SYSTEM' && a.status !== 'RESOLVED').length;

    const orgOutbox = Array.from(this.outbox.values()).filter((o) => o.organization_id === organizationId);
    const outbox_pending = orgOutbox.filter((o) => o.status === 'PENDING' || o.status === 'RETRYING').length;
    const outbox_failed = orgOutbox.filter((o) => o.status === 'FAILED').length;

    const delivery_health = outbox_failed > 5 ? 'DEGRADED' : 'HEALTHY';

    return {
      unread_count,
      total_active,
      acknowledged_count,
      resolved_count,
      high_or_critical_count,
      overdue_action_alerts,
      review_alerts,
      pattern_alerts,
      system_alerts,
      outbox_pending,
      outbox_failed,
      delivery_health,
    };
  }

  // ==========================================
  // RULES CONFIGURATION & VERSIONING
  // ==========================================

  public listRules(organizationId: string): AlertRule[] {
    return Array.from(this.rules.values()).filter((r) => r.organization_id === organizationId);
  }

  public updateRule(
    id: string,
    organizationId: string,
    updates: Partial<AlertRule>,
    actor: AlertActor
  ): AlertRule {
    const rule = this.rules.get(id);
    if (!rule || rule.organization_id !== organizationId) {
      throw new Error(`Rule ${id} not found in organization`);
    }

    const now = new Date().toISOString();
    const updatedRule: AlertRule = {
      ...rule,
      ...updates,
      version: rule.version + 1,
      updated_by: actor.name,
      updated_at: now,
    };

    this.rules.set(id, updatedRule);

    this.recordAudit({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organization_id: organizationId,
      alert_id: id,
      event_name: 'ALERT_RULE_UPDATED',
      actor,
      timestamp: now,
      details: { previous_version: rule.version, new_version: updatedRule.version, changes: updates },
    });

    return updatedRule;
  }

  // ==========================================
  // PREFERENCES & POLICIES
  // ==========================================

  public getUserPreferences(userId: string, organizationId: string): UserNotificationPreferences {
    const key = `${organizationId}:${userId}`;
    const existing = this.userPreferences.get(key);
    if (existing) return existing;

    const defaultPref: UserNotificationPreferences = {
      user_id: userId,
      organization_id: organizationId,
      in_app_enabled: true,
      email_enabled: true,
      webhook_enabled: false,
      min_severity: 'NOTICE',
      categories_enabled: {
        REVIEW: true,
        RISK: true,
        PATTERN: true,
        ACTION: true,
        SYSTEM: true,
      },
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '07:00',
        timezone: 'Asia/Kolkata',
        allow_critical: true,
      },
      updated_at: new Date().toISOString(),
    };

    this.userPreferences.set(key, defaultPref);
    return defaultPref;
  }

  public updateUserPreferences(
    userId: string,
    organizationId: string,
    updates: Partial<UserNotificationPreferences>
  ): UserNotificationPreferences {
    const current = this.getUserPreferences(userId, organizationId);
    const updated: UserNotificationPreferences = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.userPreferences.set(`${organizationId}:${userId}`, updated);
    return updated;
  }

  public getOrgPolicy(organizationId: string): OrganizationAlertPolicy {
    const policy = this.orgPolicies.get(organizationId);
    if (policy) return policy;

    const defaultPolicy: OrganizationAlertPolicy = {
      organization_id: organizationId,
      policy_version: 1,
      alerts_globally_enabled: true,
      default_cooldown_seconds: 3600,
      retention_days: 90,
      channels_enabled: { IN_APP: true, EMAIL: true, WEBHOOK: true },
      updated_at: new Date().toISOString(),
    };

    this.orgPolicies.set(organizationId, defaultPolicy);
    return defaultPolicy;
  }

  public updateOrgPolicy(
    organizationId: string,
    updates: Partial<OrganizationAlertPolicy>
  ): OrganizationAlertPolicy {
    const current = this.getOrgPolicy(organizationId);
    const updated: OrganizationAlertPolicy = {
      ...current,
      ...updates,
      policy_version: current.policy_version + 1,
      updated_at: new Date().toISOString(),
    };
    this.orgPolicies.set(organizationId, updated);
    return updated;
  }

  // ==========================================
  // AUDIT LOGGING & OBSERVABILITY
  // ==========================================

  private recordAudit(record: AlertAuditRecord) {
    this.auditRecords.push(record);
    if (this.auditRecords.length > 2000) {
      this.auditRecords.shift();
    }
  }

  public getAuditHistory(alertId: string, organizationId: string): AlertAuditRecord[] {
    return this.auditRecords.filter(
      (rec) => rec.alert_id === alertId && rec.organization_id === organizationId
    );
  }

  public getOutboxStats(organizationId: string) {
    const items = Array.from(this.outbox.values()).filter((o) => o.organization_id === organizationId);
    return {
      total: items.length,
      sent: items.filter((o) => o.status === 'SENT').length,
      pending: items.filter((o) => o.status === 'PENDING').length,
      retrying: items.filter((o) => o.status === 'RETRYING').length,
      failed: items.filter((o) => o.status === 'FAILED').length,
      recent: items.slice(-10).reverse(),
    };
  }
}

export const alertStore = new AlertStore();
