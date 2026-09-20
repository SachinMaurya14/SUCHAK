# SUCHAK - Advanced HSE Analytics, Executive Intelligence & Reporting Architecture

## 1. Analytics Architecture
The SUCHAK Analytics Engine operates on an authoritative tiered pipeline:
```
Source Domain Stores
  ├─ Phase 3: DataStore (Reports, Sites, Activities)
  ├─ Phase 4: SafetyEngine (NLP SIF & Precursors)
  ├─ Phase 6: RiskIntelligenceService (Authoritative Risk Assessments)
  ├─ Phase 8: PatternStore (Recurring Clusters)
  ├─ Phase 9: ReviewStore (Human Review Queue & Verification)
  ├─ Phase 10: ActionStore (CAPA Records & Status)
  └─ Phase 11: AlertStore (Operational Early-Warnings)
         │
         ▼
Analytics Query Layer (server/analyticsService.ts)
  ├─ Multi-Tenant Isolation (organization_id)
  ├─ Time-Window Partitioning (7d, 30d, 90d, 1y, custom, all)
  ├─ Multi-Dimension Filtering (site, activity, report type, risk band, SIF status)
  ├─ Reviewed-State Policy Evaluation (LATEST_REVIEWED vs ORIGINAL_AI)
  ├─ Mathematical Comparisons & Safe Baseline Diffs
  └─ Sample Sufficiency Guards (< 3 reports flagged INSUFFICIENT_DATA)
         │
         ▼
Analytics API Surface (/api/v1/analytics/*)
  ├─ /overview: Full executive dashboard payload
  ├─ /reports, /sif, /risk, /precursors, /barriers, /iogp
  ├─ /sites, /activities, /patterns, /reviews, /actions, /alerts
  ├─ /trends: Normalized daily time-series telemetry
  ├─ /management-summary: Certified executive briefing
  └─ /export: Certified CSV & JSON export engine
         │
         ▼
Executive Intelligence UI (src/pages/AnalyticsPage.tsx)
  ├─ Executive KPI Cards with Governance & Formula Popovers
  ├─ Deterministic Summary Strip with Non-Causal Protocol
  ├─ Interactive SVG Trend Timeline & SIF Donut Visualizers
  ├─ Multi-Asset vs Precursor Matrix Heatmap
  ├─ Sub-Views (Overview, Reports & SIF, Risk & Barriers, Precursors, Sites, Workflows, Governance)
  ├─ Direct Drill-Down to Domain Queues
  ├─ Management Brief Generator Modal (Print, PDF, JSON, Copy)
  └─ Export Center Modal (CSV / JSON datasets)
```

## 2. Metric Definitions & Formulas
All metrics maintain an authoritative catalog (`METRIC_DEFINITIONS`) with strict schema versioning (`ANALYTICS_V1`, Metric Catalog `2026.1`):
1. **TOTAL_REPORTS**: Total count of evaluated safety observations in scope.
2. **SIF_PRECURSORS**: Count of reports meeting SIF criteria under the selected policy.
3. **SIF_RATE**: `(SIF_PRECURSORS / TOTAL_REPORTS) * 100` (expressed as a percentage).
4. **HIGH_CRITICAL_PRIORITY**: Count of reports categorized as `HIGH` or `CRITICAL` risk band by Phase 6 risk engine.
5. **ACTIVE_PATTERNS**: Count of unarchived recurring precursor clusters from Phase 8.
6. **OPEN_ACTIONS**: Count of corrective/preventive actions in states other than `CLOSED` or `CANCELLED`.
7. **OVERDUE_ACTIONS**: Count of open actions where `due_date < current_timestamp`.
8. **COMPLETION_RATE**: `((CLOSED + VERIFIED) / (TOTAL_ACTIONS - CANCELLED)) * 100`.
9. **PENDING_REVIEWS**: Reports in review queue requiring triage (`Unreviewed` or `Under Review`).
10. **ACTIVE_ALERTS**: Alerts in `UNREAD`, `ACKNOWLEDGED`, or `ESCALATED` states.
11. **PRECURSOR_DENSITY**: Total precursor observations divided by total reports for a site.

## 3. Source-of-Truth Mapping
- **Reports Telemetry**: `dataStore.ts`
- **SIF Classifications**: `safetyEngine.ts` (Phase 4 AI baseline) and `reviewStore.ts` (Phase 9 human verification)
- **Risk Assessments**: `riskIntelligenceService.ts` / `riskAggregationService.ts` (Phase 6)
- **Recurring Patterns**: `patternStore.ts` (Phase 8)
- **HSE Reviews**: `reviewStore.ts` (Phase 9)
- **CAPA Actions**: `actionStore.ts` (Phase 10)
- **Early-Warning Alerts**: `alertStore.ts` (Phase 11)

## 4. Reviewed-State Policy
SUCHAK enforces a toggleable analytical policy:
- `LATEST_REVIEWED` (Default): Human reviewer verified determinations override initial AI classification. If a report is confirmed or overridden in Phase 9, that decision is authoritative.
- `ORIGINAL_AI`: Evaluates the raw model output from Phase 4 regardless of subsequent human triage.
The active policy is stamped on all API outputs (`policy_applied`) and visible in the UI header.

## 5. Time-Window Behavior
- Presets: `7d` (7 calendar days), `30d` (30 calendar days), `90d` (90 calendar days), `1y` (365 calendar days), `all` (unbounded), and `custom` (explicit `start_date` and `end_date`).
- Windows are evaluated relative to report timestamp (`report_datetime` or `created_at`).

## 6. Period Comparison
Each metric evaluates the current window against an identical prior interval:
- Prior Period Start = `Current Period Start - Duration`
- Prior Period End = `Current Period Start`
- Absolute Change: `Current - Previous`
- Percentage Change: `((Current - Previous) / Previous) * 100`

## 7. Percentage Calculations & Zero-Baseline Handling
- If `Previous === 0` and `Current === 0`: Change is `0.0%`, direction `UNCHANGED`, label `"0 in both periods"`.
- If `Previous === 0` and `Current > 0`: Percentage is `null`, direction `NEW_BASELINE`, label `"No prior-period baseline"`.
- No `Infinity` or `NaN` values are ever emitted or rendered.

## 8. Site Analytics & Ranking
Sites are ranked by precursor density, SIF occurrence rate, and open action volume. Sample sufficiency is evaluated per site.

## 9. Activity Analytics
Activities correlate report volume with dominant risk priority, SIF potential, and top associated precursor categories (e.g. Confined Space, Pressure Testing, Crane Rigging).

## 10. SIF Analytics
Maintains distinct counts for:
- SIF Potential
- Non-SIF Potential
- Needs Review
- Human Confirmed SIF vs Human Overrides

## 11. Risk Analytics
Uses Phase 6 authoritative scores, presenting distributions across `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, and `NEEDS_REVIEW` bands.

## 12. Precursor Analytics
Categorizes physical conditions and operational behaviors into standardized hazard taxonomies (e.g. Line of Fire, Barrier Degradation, Pressurized Line, Stored Energy).

## 13. Barrier Analytics & Unknown State Preservation
Tracks physical and operational defenses across states:
- `FAILED`
- `BYPASSED`
- `INADEQUATE`
- `UNKNOWN` (Strictly preserved: never imputed to 0 or assumed functioning)
- `NOT_VERIFIED`

## 14. IOGP Life-Saving Rules Concordance
Maps precursor findings directly to the 9 IOGP international oil and gas safety rules with rule descriptions, incident shares, and activity associations.

## 15. Pattern Analytics
Integrates Phase 8 recurring pattern metrics: emerging clusters, persistent clusters, support counts, and affected facilities.

## 16. Review Analytics
Tracks triage throughput, pending unassigned records, in-progress reviews, average review age in hours, and estimated queue backlog days.

## 17. CAPA Analytics
Monitors action aging buckets (0-7 days, 8-30 days, 31-60 days, 60+ days) and enforces the standardized resolution formula.

## 18. Alert Analytics
Synthesizes notification signals from Phase 11 across severity levels (`CRITICAL`, `HIGH`, `WARNING`, `NOTICE`, `INFO`) and operational categories.

## 19. Data Completeness Index
Computes the percentage of reports with complete analysis, recording validated schemas and flag counts for missing fields.

## 20. Insufficient Sample Handling
Any asset or activity with `< 3` reports is designated `INSUFFICIENT_DATA`. The UI displays a warning badge to prevent premature statistical conclusions.

## 21. Unknown Values Handling
Missing or inconclusive values are recorded as `UNKNOWN` or `INCONCLUSIVE` across all data layers, never silently defaulted to low risk.

## 22. Metric Versioning
All responses include `schema_version: "ANALYTICS_V1"` and `metric_version: "2026.1"` to prevent semantic drift.

## 23. Caching Architecture
In-memory 15-second TTL cache keyed by tenant, time window, site, activity, and review policy. Balances real-time responsiveness with computational efficiency.

## 24. Tenant Isolation
All queries strictly enforce `organization_id` scoping at the service layer. Cross-tenant leakage is prevented.

## 25. Role-Based Access Control (RBAC)
- `OrgAdmin` & `HSEOfficer`: Full access to analytics, management briefings, and exports.
- `SafetyReviewer` & `SiteManager`: Scoped access to operational views and site data.

## 26. Timezone Handling
Timestamps are normalized to UTC in the engine and formatted to localized user display in the client.

## 27. Export Behavior
Certified CSV and JSON exports for:
- Executive Overview KPIs
- SIF Distribution
- Site Comparative Metrics
- Precursor Categories
- CAPA Resolution Telemetry

## 28. Security
Sanitized query parameters, validated inputs, rate-limited aggregation requests, and strict avoidance of unsafe eval or script injection.

## 29. Privacy & Anonymity
Reporter anonymity preferences are respected; personal identifiers are excluded from exported aggregate analytics.

## 30. Observability & Audit Logging
The engine logs structured compliance events:
- `ANALYTICS_VIEWED`
- `ANALYTICS_FILTERED`
- `ANALYTICS_DRILLDOWN`
- `ANALYTICS_EXPORTED`
- `MANAGEMENT_REPORT_GENERATED`

## 31. Testing & Validation
All calculations are validated with unit tests, ensuring determinism, zero division prevention, and proper filter application.

## 32. Methodological Limitations & Non-Causal Grounding Rule
**MANDATORY HSE INTEGRITY PROTOCOL:**
`COUNT / RATE / DISTRIBUTION / TREND ≠ CAUSATION ≠ PREDICTION ≠ AUTONOMOUS DECISION`
Descriptive metrics indicate past observations and early-warning signals. They do not constitute autonomous risk determinations or causal proof.

## 33. Phase 13 Handoff
Phase 12 provides a complete, certified analytics foundation. Phase 13 will introduce advanced executive reporting scheduled exports, automated email dispatch of management summaries, and enterprise BI connectors.
