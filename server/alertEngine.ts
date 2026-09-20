import { alertStore } from './alertStore.ts';
import { actionStore } from './actionStore.ts';
import { dataStore } from './dataStore.ts';
import { patternStore } from './patternDiscoveryService.ts';
import { DomainEvent } from './alertTypes.ts';

export class AlertEngine {
  /**
   * Run a deterministic evaluation cycle across enterprise safety domains:
   * 1. Overdue Actions (Phase 10)
   * 2. Verification Queue (Phase 10)
   * 3. Unreviewed High/Critical SIF Reports (Phases 4-6, 9)
   * 4. Emerging / Persistent Precursor Patterns (Phase 8)
   */
  public runEvaluationCycle(organizationId: string = 'oil-india-demo') {
    const createdAlerts: any[] = [];
    const now = Date.now();

    // 1. Evaluate Overdue & Pending Verification Actions
    try {
      const actions = actionStore.getActions({ organization_id: organizationId, page_size: 100 }).data;

      for (const action of actions) {
        // Overdue check
        if (action.status !== 'CLOSED' && action.status !== 'CANCELLED') {
          const dueTime = new Date(action.due_at).getTime();
          if (dueTime < now) {
            const overdueHours = Math.floor((now - dueTime) / (1000 * 60 * 60));
            const overdueDays = Math.floor(overdueHours / 24);

            const event: DomainEvent = {
              event_id: `evt-act-overdue-${action.id}`,
              organization_id: organizationId,
              event_type: 'ACTION_OVERDUE',
              source_type: 'ACTION',
              source_id: action.id,
              source_number: action.action_number,
              timestamp: new Date().toISOString(),
              data: {
                title: action.title,
                site_id: action.site_id,
                site_name: action.site_name,
                location_name: action.location_name,
                activity_name: action.activity_name,
                due_at: action.due_at,
                overdue_hours: overdueHours,
                overdue_days: overdueDays,
                priority: action.priority,
                owner_user_name: action.owner_user_name,
              },
            };

            const alerts = alertStore.evaluateEvent(event);
            createdAlerts.push(...alerts);
          }
        }

        // Verification queue check
        if (
          action.status === 'COMPLETED' &&
          action.verification_required &&
          action.verification_status !== 'VERIFIED'
        ) {
          const event: DomainEvent = {
            event_id: `evt-act-verif-${action.id}`,
            organization_id: organizationId,
            event_type: 'ACTION_VERIFICATION_REQUIRED',
            source_type: 'ACTION',
            source_id: action.id,
            source_number: action.action_number,
            timestamp: new Date().toISOString(),
            data: {
              title: action.title,
              site_id: action.site_id,
              site_name: action.site_name,
              location_name: action.location_name,
              activity_name: action.activity_name,
              owner_user_name: action.owner_user_name,
              priority: action.priority,
              completed_at: action.completed_at,
            },
          };

          const alerts = alertStore.evaluateEvent(event);
          createdAlerts.push(...alerts);
        }

        // Verification failed check
        if (action.verification_status === 'VERIFICATION_FAILED') {
          const event: DomainEvent = {
            event_id: `evt-act-fail-${action.id}`,
            organization_id: organizationId,
            event_type: 'ACTION_VERIFICATION_FAILED',
            source_type: 'ACTION',
            source_id: action.id,
            source_number: action.action_number,
            timestamp: new Date().toISOString(),
            data: {
              title: action.title,
              site_id: action.site_id,
              site_name: action.site_name,
              location_name: action.location_name,
              activity_name: action.activity_name,
              owner_user_name: action.owner_user_name,
              priority: action.priority,
            },
          };

          const alerts = alertStore.evaluateEvent(event);
          createdAlerts.push(...alerts);
        }
      }
    } catch (err) {
      console.warn('[AlertEngine] Error evaluating actions:', err);
    }

    // 2. Evaluate Unreviewed SIF & Critical Risk Reports
    try {
      const reports = dataStore.listReports({ page_size: 50 }).items;

      for (const rep of reports) {
        if (rep.review_status === 'Unreviewed' || rep.review_status === 'UNREVIEWED' || rep.review_status === 'PENDING') {
          const riskLevel = rep.latest_risk_assessment?.priority || 'MEDIUM';
          const isCritical = riskLevel === 'CRITICAL';
          const hasSif = Boolean(rep.latest_analysis?.sif_potential);

          if (isCritical) {
            const event: DomainEvent = {
              event_id: `evt-crit-rev-${rep.id}`,
              organization_id: organizationId,
              event_type: 'CRITICAL_REPORT_REVIEW',
              source_type: 'REPORT',
              source_id: rep.id,
              source_number: rep.report_number || rep.id,
              timestamp: new Date().toISOString(),
              data: {
                title: rep.description ? rep.description.substring(0, 80) : 'Critical Risk Report',
                site_id: rep.site_id,
                site_name: rep.site?.name || rep.site_id,
                location_name: rep.location?.name || '',
                risk_level: 'CRITICAL',
                sif_potential: hasSif,
                review_status: rep.review_status,
              },
            };

            const alerts = alertStore.evaluateEvent(event);
            createdAlerts.push(...alerts);
          } else if (hasSif || riskLevel === 'HIGH') {
            const event: DomainEvent = {
              event_id: `evt-rev-req-${rep.id}`,
              organization_id: organizationId,
              event_type: 'REVIEW_REQUIRED',
              source_type: 'REPORT',
              source_id: rep.id,
              source_number: rep.report_number || rep.id,
              timestamp: new Date().toISOString(),
              data: {
                title: rep.description ? rep.description.substring(0, 80) : 'Precursor Report',
                site_id: rep.site_id,
                site_name: rep.site?.name || rep.site_id,
                risk_level: riskLevel,
                sif_potential: hasSif,
                review_status: rep.review_status,
              },
            };

            const alerts = alertStore.evaluateEvent(event);
            createdAlerts.push(...alerts);
          }
        }
      }
    } catch (err) {
      console.warn('[AlertEngine] Error evaluating reports:', err);
    }

    // 3. Evaluate Patterns from Discovery Store
    try {
      const patterns = patternStore.getPatterns(organizationId).patterns;
      for (const pat of patterns) {
        if (pat.status === 'EMERGING' && pat.support_count >= 3) {
          const event: DomainEvent = {
            event_id: `evt-pat-emerge-${pat.id}`,
            organization_id: organizationId,
            event_type: 'PATTERN_EMERGING',
            source_type: 'PATTERN',
            source_id: pat.id,
            source_number: pat.pattern_number,
            timestamp: new Date().toISOString(),
            data: {
              title: pat.title,
              summary: pat.summary,
              pattern_support_count: pat.support_count,
              pattern_strength: pat.pattern_strength,
            },
          };

          const alerts = alertStore.evaluateEvent(event);
          createdAlerts.push(...alerts);
        }
      }
    } catch (err) {
      console.warn('[AlertEngine] Error evaluating patterns:', err);
    }

    // 4. Flush outbox
    const outboxResult = alertStore.processPendingOutbox();

    return {
      evaluated_at: new Date().toISOString(),
      alerts_generated: createdAlerts.length,
      outbox: outboxResult,
      active_metrics: alertStore.getMetrics(organizationId),
    };
  }
}

export const alertEngine = new AlertEngine();
