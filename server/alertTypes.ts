/**
 * SUCHAK Phase 11 — Alerts, Escalation & Notification Intelligence Types
 * 
 * CORE PRINCIPLE:
 * SIF Classification ≠ Risk Priority
 * Risk Priority      ≠ Pattern Strength
 * Pattern Strength   ≠ Alert Severity
 * Alert Severity     ≠ Safety Outcome
 * 
 * Alerts are INFORMATIONAL / WORKFLOW SIGNALS.
 * Alerts do not make autonomous safety decisions or mutate underlying safety records.
 */

export type AlertSeverity = 'INFO' | 'NOTICE' | 'WARNING' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'UNREAD' | 'READ' | 'ACKNOWLEDGED' | 'DISMISSED' | 'RESOLVED' | 'EXPIRED';

export type AlertSourceType = 'REPORT' | 'REVIEW' | 'RISK_ASSESSMENT' | 'PATTERN' | 'ACTION' | 'SYSTEM';

export type AlertCategory = 'REVIEW' | 'RISK' | 'PATTERN' | 'ACTION' | 'SYSTEM';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'WEBHOOK';

export type AlertEventType =
  | 'REPORT_SUBMITTED'
  | 'ANALYSIS_COMPLETED'
  | 'ANALYSIS_FAILED'
  | 'REVIEW_REQUIRED'
  | 'REVIEW_ASSIGNED'
  | 'REVIEW_STALE'
  | 'RISK_ASSESSMENT_COMPLETED'
  | 'RISK_REVIEW_REQUIRED'
  | 'CRITICAL_REPORT_REVIEW'
  | 'PATTERN_DISCOVERED'
  | 'PATTERN_EMERGING'
  | 'PATTERN_PERSISTENT'
  | 'ACTION_CREATED'
  | 'ACTION_ASSIGNED'
  | 'ACTION_OVERDUE'
  | 'ACTION_VERIFICATION_REQUIRED'
  | 'ACTION_VERIFICATION_FAILED'
  | 'ACTION_REOPENED'
  | 'ACTION_CLOSED'
  | 'SOURCE_DATA_CHANGED'
  | 'SYSTEM_PROCESSING_FAILED';

export interface EscalationTier {
  level: number;
  delay_hours: number;
  target_role: string;
  channel: NotificationChannel;
  description: string;
}

export interface AlertRuleConditions {
  min_risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sif_precursor_only?: boolean;
  overdue_hours_threshold?: number;
  stale_days_threshold?: number;
  pattern_support_threshold?: number;
  site_ids?: string[];
  [key: string]: any;
}

export interface AlertRule {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  event_type: AlertEventType;
  category: AlertCategory;
  enabled: boolean;
  severity: AlertSeverity;
  channels: NotificationChannel[];
  conditions: AlertRuleConditions;
  cooldown_seconds: number;
  escalation_policy: {
    enabled: boolean;
    levels: EscalationTier[];
  };
  version: number;
  effective_from: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface AlertWhyTriggered {
  rule_matched: string;
  event_received: string;
  deterministic_evidence: string;
  evaluated_conditions: Record<string, any>;
}

export interface AlertSourceContext {
  title?: string;
  site_id?: string;
  site_name?: string;
  location_name?: string;
  activity_name?: string;
  risk_level?: string;
  sif_potential?: boolean;
  due_at?: string;
  overdue_days?: number;
  pattern_support_count?: number;
  verification_status?: string;
  review_status?: string;
}

export interface AlertEscalationHistoryItem {
  level: number;
  previous_level: number;
  escalated_to_role: string;
  reason: string;
  timestamp: string;
}

export interface AlertActor {
  id: string;
  name: string;
  role: string;
  email?: string;
}

export interface Alert {
  id: string;
  organization_id: string;
  rule_id: string;
  rule_name: string;
  rule_version: number;
  event_type: AlertEventType;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  source_type: AlertSourceType;
  source_id: string;
  source_number: string;
  source_url: string;
  source_version?: number;
  target_user_id?: string;
  target_user_name?: string;
  target_role?: string;
  target_site_id?: string;
  target_site_name?: string;
  dedupe_key: string;
  cooldown_until?: string;
  why_triggered: AlertWhyTriggered;
  source_context: AlertSourceContext;
  escalation_level: number;
  escalation_history: AlertEscalationHistoryItem[];
  acknowledged_at?: string;
  acknowledged_by?: {
    id: string;
    name: string;
    role: string;
    note?: string;
  };
  dismissed_at?: string;
  dismissed_by?: {
    id: string;
    name: string;
    role: string;
    reason: string;
  };
  resolved_at?: string;
  resolved_by?: {
    id: string;
    name: string;
    role: string;
    resolution_note: string;
  };
  read_at?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserNotificationPreferences {
  user_id: string;
  organization_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  webhook_enabled: boolean;
  min_severity: AlertSeverity;
  categories_enabled: Record<AlertCategory, boolean>;
  quiet_hours: {
    enabled: boolean;
    start_time: string; // e.g. "22:00"
    end_time: string;   // e.g. "07:00"
    timezone: string;
    allow_critical: boolean;
  };
  updated_at: string;
}

export interface OrganizationAlertPolicy {
  organization_id: string;
  policy_version: number;
  alerts_globally_enabled: boolean;
  default_cooldown_seconds: number;
  retention_days: number;
  channels_enabled: Record<NotificationChannel, boolean>;
  webhook_config?: {
    endpoint_url: string;
    secret_configured: boolean;
    allowed_events: AlertEventType[];
    enabled: boolean;
  };
  email_config?: {
    sender_address: string;
    provider_mode: 'SIMULATED' | 'SMTP';
    enabled: boolean;
  };
  updated_at: string;
}

export interface NotificationOutboxItem {
  id: string;
  organization_id: string;
  alert_id: string;
  channel: NotificationChannel;
  recipient: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';
  attempts: number;
  max_attempts: number;
  last_attempt_at?: string;
  error_message?: string;
  payload: any;
  created_at: string;
  sent_at?: string;
}

export interface AlertAuditRecord {
  id: string;
  organization_id: string;
  alert_id: string;
  event_name:
    | 'ALERT_CREATED'
    | 'ALERT_DELIVERED'
    | 'ALERT_READ'
    | 'ALERT_ACKNOWLEDGED'
    | 'ALERT_DISMISSED'
    | 'ALERT_ESCALATED'
    | 'ALERT_RESOLVED'
    | 'ALERT_EXPIRED'
    | 'ALERT_RULE_UPDATED'
    | 'ALERT_RULE_DISABLED';
  actor: AlertActor;
  timestamp: string;
  details: Record<string, any>;
}

export interface DomainEvent {
  event_id: string;
  organization_id: string;
  event_type: AlertEventType;
  source_type: AlertSourceType;
  source_id: string;
  source_number: string;
  source_version?: number;
  timestamp: string;
  actor?: AlertActor;
  data: Record<string, any>;
}

export interface AlertMetrics {
  unread_count: number;
  total_active: number;
  acknowledged_count: number;
  resolved_count: number;
  high_or_critical_count: number;
  overdue_action_alerts: number;
  review_alerts: number;
  pattern_alerts: number;
  system_alerts: number;
  outbox_pending: number;
  outbox_failed: number;
  delivery_health: 'HEALTHY' | 'DEGRADED' | 'OPERATIONAL';
}

export interface AlertListQuery {
  organization_id?: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  category?: AlertCategory;
  event_type?: AlertEventType;
  source_type?: AlertSourceType;
  site_id?: string;
  target_user_id?: string;
  target_role?: string;
  unread_only?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'severity' | 'status';
  sort_dir?: 'asc' | 'desc';
}
