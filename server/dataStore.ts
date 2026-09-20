import { evaluateSafetyNarrativeDeterministic, analyzeReportSafety, SafetyAnalysisResult } from './safetyEngine.ts';
import {
  riskIntelligenceService,
  RiskAssessmentRecord,
} from './riskIntelligenceService.ts';
import {
  riskAggregationService,
  SiteRiskAggregation,
  ActivityRiskAggregation,
} from './riskAggregationService.ts';
import {
  RiskPolicy,
  DEFAULT_RISK_POLICY,
  validateRiskPolicy,
} from './riskPolicy.ts';
import {
  VectorDocument,
  SemanticDocument,
  VectorStoreHealth,
  VectorConsistencyReport,
  SimilarReportItem,
  SemanticSearchResponse,
  IndexStatus,
} from './vectorTypes.ts';
import { FaissVectorStore, IVectorStore } from './vectorStore.ts';
import { EmbeddingService, embeddingService } from './embeddingService.ts';
import { SimilaritySearchService, SimilarSearchOptions } from './similaritySearchService.ts';
import {
  patternStore,
  patternDiscoveryEngine,
  PatternFeatureBuilder,
  DEFAULT_DISCOVERY_CONFIG,
} from './patternDiscoveryService.ts';
import {
  PrecursorPattern,
  PatternSummaryKPIs,
  DiscoveryRun,
  DiscoveryConfiguration,
  PatternStatus,
  PatternType,
  PatternFeatureRepresentation,
} from './patternTypes.ts';
import { reviewStore } from './reviewStore.ts';

export interface SiteRecord {
  id: string;
  name: string;
  code: string;
  site_type: string;
}

export interface LocationRecord {
  id: string;
  site_id: string;
  name: string;
  code: string;
  description: string;
}

export interface ActivityRecord {
  id: string;
  name: string;
  code: string;
  category: string;
  risk_level_baseline: string;
}

export interface ReportRecord {
  id: string;
  organization_id: string;
  report_number: string;
  report_type: string;
  site_id: string;
  location_id?: string | null;
  activity_id?: string | null;
  report_datetime: string;
  description: string;
  actual_outcome?: string | null;
  processing_status: string;
  review_status: string;
  source: string;
  created_at: string;
  updated_at: string;
  site?: SiteRecord | null;
  location?: LocationRecord | null;
  activity?: ActivityRecord | null;
  attachments_count?: number;
  latest_analysis?: SafetyAnalysisResult | null;
  latest_risk_assessment?: RiskAssessmentRecord | null;
  embedding_status?: IndexStatus;
  embedding_content_hash?: string;
  embedding_version?: string;
  // Phase 18: Enterprise Integration & Data Governance Fields
  source_system?: string;
  source_record_id?: string;
  source_schema_version?: string;
  ingestion_timestamp?: string;
  connector_id?: string;
  data_classification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  provenance_type?: 'SOURCE_DATA' | 'AI_GENERATED' | 'HUMAN_CORRECTED' | 'DERIVED' | 'SYSTEM_GENERATED';
  legal_hold?: boolean;
  legal_hold_id?: string | null;
  archival_status?: 'ACTIVE' | 'ARCHIVED' | 'PURGED';
  retention_expires_at?: string;
}

export interface AuditRecord {
  id: string;
  report_id: string;
  event_type: string;
  action_summary: string;
  actor_name: string;
  created_at: string;
}

export const SITES: SiteRecord[] = [
  {
    id: 'site-digboi-01',
    code: 'RIG-DIGBOI-04',
    name: 'Digboi Central Rig #4 [SYNTHETIC DEMO]',
    site_type: 'DRILLING_RIG',
  },
  {
    id: 'site-moran-02',
    code: 'SITE-MORAN-A',
    name: 'Moran Drilling Site A [SYNTHETIC DEMO]',
    site_type: 'DRILLING_RIG',
  },
  {
    id: 'site-duliajan-03',
    code: 'GGS-DULIAJAN',
    name: 'Duliajan Gas Gathering Station [SYNTHETIC DEMO]',
    site_type: 'PRODUCTION_FACILITY',
  },
  {
    id: 'site-numaligarh-04',
    code: 'NUM-TERMINAL-01',
    name: 'Numaligarh Pipeline Terminal [SYNTHETIC DEMO]',
    site_type: 'REFINERY',
  },
];

export const LOCATIONS: LocationRecord[] = [
  { id: 'loc-01', site_id: 'site-digboi-01', name: 'Drill Floor / Rotary Table', code: 'ROTARY', description: 'Primary rotary drilling envelope' },
  { id: 'loc-02', site_id: 'site-digboi-01', name: 'Substructure / Blowout Preventer Stack', code: 'BOP', description: 'BOP cellar and choke manifold' },
  { id: 'loc-03', site_id: 'site-digboi-01', name: 'Mud Tank & Chemical Handling Area', code: 'MUD', description: 'Shale shaker and active mud pits' },
  { id: 'loc-04', site_id: 'site-moran-02', name: 'Main Pipe Deck', code: 'PIPEDECK', description: 'Tubular storage and racking' },
  { id: 'loc-05', site_id: 'site-moran-02', name: 'Crane Lifting Corridor', code: 'CRANE', description: 'Pedestal crane slewing path' },
  { id: 'loc-06', site_id: 'site-moran-02', name: 'Catwalk & V-Door', code: 'CATWALK', description: 'Drill pipe pull-in access' },
  { id: 'loc-07', site_id: 'site-duliajan-03', name: 'High Pressure Separator Bank', code: 'SEPARATOR', description: 'Three-phase production units' },
  { id: 'loc-08', site_id: 'site-duliajan-03', name: 'Compressor Shed 2', code: 'COMPRESSOR', description: 'Reciprocating gas compressors' },
  { id: 'loc-09', site_id: 'site-duliajan-03', name: 'Flange Manifold Quadrant B', code: 'MANIFOLD', description: 'Isolation manifold headers' },
  { id: 'loc-10', site_id: 'site-numaligarh-04', name: 'Storage Tank Farm Bay 4', code: 'TANKFARM', description: 'Crude and condensate tanks' },
  { id: 'loc-11', site_id: 'site-numaligarh-04', name: 'Metering Station & Scraper Trap', code: 'METERING', description: 'Pig receiver and custody transfer' },
];

export const ACTIVITIES: ActivityRecord[] = [
  { id: 'act-01', code: 'ACT-DRILL', name: 'Drilling & Well Operations', category: 'DRILLING', risk_level_baseline: 'CRITICAL' },
  { id: 'act-02', code: 'ACT-RIGGING', name: 'Heavy Lifting & Rigging', category: 'LOGISTICS', risk_level_baseline: 'HIGH' },
  { id: 'act-03', code: 'ACT-CONFINED', name: 'Confined Space & Flange Work', category: 'MAINTENANCE', risk_level_baseline: 'HIGH' },
  { id: 'act-04', code: 'ACT-HOTWORK', name: 'Hot Work & Welding', category: 'MAINTENANCE', risk_level_baseline: 'MEDIUM' },
  { id: 'act-05', code: 'ACT-PRESSURE', name: 'High Pressure Line Testing', category: 'TESTING', risk_level_baseline: 'CRITICAL' },
];

export const REPORT_TYPES = [
  {
    value: 'Unsafe Act',
    label: 'Unsafe Act',
    description: 'Human behavior or procedural deviation that violates safe work procedures and introduces risk.',
  },
  {
    value: 'Unsafe Condition',
    label: 'Unsafe Condition',
    description: 'Physical workplace condition, mechanical flaw, or environmental state capable of causing harm.',
  },
  {
    value: 'Near-Miss',
    label: 'Near Miss',
    description: 'An unplanned sequence of events that had the potential for injury or asset damage but resulted in none.',
  },
  {
    value: 'Incident',
    label: 'Incident',
    description: 'An event resulting in actual personal injury, asset damage, environmental release, or process loss.',
  },
];

// Initial seeded reports
const INITIAL_REPORTS: ReportRecord[] = [
  {
    id: 'rep-uuid-0891',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0891',
    report_type: 'Near-Miss',
    site_id: 'site-digboi-01',
    location_id: 'loc-01',
    activity_id: 'act-05',
    report_datetime: '2026-09-18T14:22:00.000Z',
    description:
      'During hydrostatic pressure testing at 5,000 PSI on manifold #4, a junior technician stepped across the barricaded zone directly in front of the pressurized swivel joint while pressure was ramping up. The safety whip check was found to be disconnected.',
    actual_outcome: 'Test engineer aborted test via emergency bleed-off valve immediately. No physical rupture occurred.',
    processing_status: 'ANALYZED',
    review_status: 'Under Review',
    source: 'PORTAL_WEB',
    created_at: '2026-09-18T14:25:00.000Z',
    updated_at: '2026-09-18T14:30:00.000Z',
    site: SITES[0],
    location: LOCATIONS[0],
    activity: ACTIVITIES[4],
    attachments_count: 1,
  },
  {
    id: 'rep-uuid-0889',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0889',
    report_type: 'Unsafe Condition',
    site_id: 'site-duliajan-03',
    location_id: 'loc-07',
    activity_id: 'act-03',
    report_datetime: '2026-09-18T11:05:00.000Z',
    description:
      'Gas separator skid emergency exhaust valve was discovered jammed at 40% travel. Lower level confined space entry was underway 12 meters downwind without portable continuous gas monitoring in place.',
    actual_outcome: 'Gas test alarmed for low oxygen; entry team evacuated before entering vessel skirt.',
    processing_status: 'ANALYZED',
    review_status: 'Unreviewed',
    source: 'PORTAL_WEB',
    created_at: '2026-09-18T11:10:00.000Z',
    updated_at: '2026-09-18T11:10:00.000Z',
    site: SITES[2],
    location: LOCATIONS[6],
    activity: ACTIVITIES[2],
    attachments_count: 0,
  },
  {
    id: 'rep-uuid-0885',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0885',
    report_type: 'Unsafe Act',
    site_id: 'site-numaligarh-04',
    location_id: 'loc-10',
    activity_id: 'act-02',
    report_datetime: '2026-09-17T16:40:00.000Z',
    description:
      'Scaffolders working at elevation (8.5 meters) unclipped dual lanyard safety harnesses simultaneously while traversing across tank roof catwalk without a static lifeline attached.',
    actual_outcome: 'HSE supervisor noticed violation from ground and commanded work halt until temporary static line was rigged.',
    processing_status: 'ANALYZED',
    review_status: 'Verified SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-17T16:45:00.000Z',
    updated_at: '2026-09-17T17:00:00.000Z',
    site: SITES[3],
    location: LOCATIONS[9],
    activity: ACTIVITIES[1],
    attachments_count: 2,
  },
  {
    id: 'rep-uuid-0880',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0880',
    report_type: 'Near-Miss',
    site_id: 'site-moran-02',
    location_id: 'loc-05',
    activity_id: 'act-02',
    report_datetime: '2026-09-17T08:15:00.000Z',
    description:
      'During dual-crane tandem lift of 12-ton drill collar basket, the secondary synthetic webbing sling sustained a severe tear upon contact with unpadded sharp structural flange angle.',
    actual_outcome: 'Banksman noticed fiber fraying and signaled immediate descent. Basket landed safely on dunnage.',
    processing_status: 'ANALYZED',
    review_status: 'Action Assigned',
    source: 'PORTAL_WEB',
    created_at: '2026-09-17T08:20:00.000Z',
    updated_at: '2026-09-17T09:00:00.000Z',
    site: SITES[1],
    location: LOCATIONS[4],
    activity: ACTIVITIES[1],
    attachments_count: 3,
  },
  {
    id: 'rep-uuid-0876',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0876',
    report_type: 'Unsafe Act',
    site_id: 'site-digboi-01',
    location_id: 'loc-03',
    activity_id: 'act-04',
    report_datetime: '2026-09-16T17:30:00.000Z',
    description:
      'Workshop assistant utilized handheld angle grinder without wearing prescribed leather wrist gauntlets and protective eye shield while deburring standard structural pipe support.',
    actual_outcome: 'Minor spark contact on forearm; no skin penetration or burns.',
    processing_status: 'ANALYZED',
    review_status: 'Overridden Non-SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-16T17:35:00.000Z',
    updated_at: '2026-09-16T18:00:00.000Z',
    site: SITES[0],
    location: LOCATIONS[2],
    activity: ACTIVITIES[3],
    attachments_count: 0,
  },
  {
    id: 'rep-uuid-0872',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0872',
    report_type: 'Unsafe Condition',
    site_id: 'site-duliajan-03',
    location_id: 'loc-08',
    activity_id: 'act-03',
    report_datetime: '2026-09-16T10:10:00.000Z',
    description:
      'Main motor control switchgear panel breaker #3 padlock had been clipped with bolt cutters without LOTO clearance log entries, while maintenance crew was performing stator coil inspection.',
    actual_outcome: 'Technician tested terminals with calibrated multimeter before touching busbar and found live potential; breaker tripped open immediately.',
    processing_status: 'ANALYZED',
    review_status: 'Verified SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-16T10:15:00.000Z',
    updated_at: '2026-09-16T11:00:00.000Z',
    site: SITES[2],
    location: LOCATIONS[7],
    activity: ACTIVITIES[2],
    attachments_count: 1,
  },
  {
    id: 'rep-uuid-1021',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-1021',
    report_type: 'Near-Miss',
    site_id: 'site-moran-02',
    location_id: 'loc-04',
    activity_id: 'act-03',
    report_datetime: '2026-09-17T09:15:00.000Z',
    description:
      'During maintenance on primary mud pump #2, equipment remained energized while electrical technician was exposed to live machinery terminals inside drive cabinet.',
    actual_outcome: 'Safety observer intervened and tripped emergency shutoff breaker prior to conductor contact; no electrical shock sustained.',
    processing_status: 'ANALYZED',
    review_status: 'Verified SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-17T09:20:00.000Z',
    updated_at: '2026-09-17T09:45:00.000Z',
    site: SITES[1],
    location: LOCATIONS[3],
    activity: ACTIVITIES[2],
    attachments_count: 2,
  },
  {
    id: 'rep-uuid-0982',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0982',
    report_type: 'Unsafe Condition',
    site_id: 'site-duliajan-03',
    location_id: 'loc-08',
    activity_id: 'act-03',
    report_datetime: '2026-09-16T14:40:00.000Z',
    description:
      'Substation transformer scheduled maintenance proceeded while feeder breaker remained live; mechanical technician was exposed to energized busbar enclosure.',
    actual_outcome: 'Auditor identified energized indicator neon lamp on upstream cubicle and commanded work halt before enclosure unbolting.',
    processing_status: 'ANALYZED',
    review_status: 'Verified SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-16T14:45:00.000Z',
    updated_at: '2026-09-16T15:10:00.000Z',
    site: SITES[2],
    location: LOCATIONS[7],
    activity: ACTIVITIES[2],
    attachments_count: 1,
  },
  {
    id: 'rep-uuid-0844',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0844',
    report_type: 'Near-Miss',
    site_id: 'site-numaligarh-04',
    location_id: 'loc-11',
    activity_id: 'act-03',
    report_datetime: '2026-09-15T11:20:00.000Z',
    description:
      'Emergency shutdown valve actuator overhaul was undertaken without positive physical energy isolation; instrument technician exposed to pressurized hydraulic control lines.',
    actual_outcome: 'Accumulator dump valve was cracked open releasing 200 PSI hydraulic spray into containment basin; technician stepped clear in time.',
    processing_status: 'ANALYZED',
    review_status: 'Verified SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-15T11:25:00.000Z',
    updated_at: '2026-09-15T12:00:00.000Z',
    site: SITES[3],
    location: LOCATIONS[10],
    activity: ACTIVITIES[2],
    attachments_count: 0,
  },
  {
    id: 'rep-uuid-0712',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0712',
    report_type: 'Unsafe Condition',
    site_id: 'site-duliajan-03',
    location_id: 'loc-08',
    activity_id: 'act-03',
    report_datetime: '2026-09-14T16:30:00.000Z',
    description:
      'Compressor cylinder valve maintenance continued while suction piping remained under residual fuel gas pressure; crew exposed to hazardous energy release.',
    actual_outcome: 'Portable combustible gas detector alarmed at 20% LEL during flange unbolting; isolation blind valve was promptly closed and line depressurized.',
    processing_status: 'ANALYZED',
    review_status: 'Verified SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-14T16:35:00.000Z',
    updated_at: '2026-09-14T17:00:00.000Z',
    site: SITES[2],
    location: LOCATIONS[7],
    activity: ACTIVITIES[2],
    attachments_count: 1,
  },
  {
    id: 'rep-test-01',
    organization_id: 'oil-india-demo',
    report_number: 'REP-TEST-A',
    report_type: 'Near-Miss',
    site_id: 'site-moran-02',
    location_id: 'loc-04',
    activity_id: 'act-03',
    report_datetime: '2026-09-18T10:00:00.000Z',
    description: 'During maintenance, worker was exposed to energized machinery.',
    actual_outcome: 'Worker stepped back upon hearing hum; lockout re-applied.',
    processing_status: 'ANALYZED',
    review_status: 'Verified SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-18T10:05:00.000Z',
    updated_at: '2026-09-18T10:10:00.000Z',
    site: SITES[1],
    location: LOCATIONS[3],
    activity: ACTIVITIES[2],
    attachments_count: 0,
  },
  {
    id: 'rep-test-02',
    organization_id: 'oil-india-demo',
    report_number: 'REP-TEST-B',
    report_type: 'Near-Miss',
    site_id: 'site-moran-02',
    location_id: 'loc-04',
    activity_id: 'act-03',
    report_datetime: '2026-09-18T10:15:00.000Z',
    description: 'Maintenance continued while equipment remained live.',
    actual_outcome: 'Supervisor noticed control console lit up and shut off main breaker.',
    processing_status: 'ANALYZED',
    review_status: 'Verified SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-18T10:20:00.000Z',
    updated_at: '2026-09-18T10:25:00.000Z',
    site: SITES[1],
    location: LOCATIONS[3],
    activity: ACTIVITIES[2],
    attachments_count: 0,
  },
  {
    id: 'rep-test-03',
    organization_id: 'oil-india-demo',
    report_number: 'REP-TEST-C',
    report_type: 'Unsafe Act',
    site_id: 'site-digboi-01',
    location_id: 'loc-02',
    activity_id: 'act-02',
    report_datetime: '2026-09-18T11:00:00.000Z',
    description: 'Worker stood below suspended load.',
    actual_outcome: 'Rigger signaled crane operator to pause; worker escorted outside swing radius.',
    processing_status: 'ANALYZED',
    review_status: 'Verified SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-18T11:05:00.000Z',
    updated_at: '2026-09-18T11:10:00.000Z',
    site: SITES[0],
    location: LOCATIONS[1],
    activity: ACTIVITIES[1],
    attachments_count: 0,
  },
  {
    id: 'rep-test-04',
    organization_id: 'oil-india-demo',
    report_number: 'REP-TEST-D',
    report_type: 'Observation',
    site_id: 'site-digboi-01',
    location_id: 'loc-01',
    activity_id: 'act-04',
    report_datetime: '2026-09-18T14:00:00.000Z',
    description: 'Office paperwork mismatch and contractor access badge form typographical error.',
    actual_outcome: 'Administrative clerk reprinted visitor badge with correct contractor trade code.',
    processing_status: 'ANALYZED',
    review_status: 'Non-SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-18T14:05:00.000Z',
    updated_at: '2026-09-18T14:10:00.000Z',
    site: SITES[0],
    location: LOCATIONS[0],
    activity: ACTIVITIES[3],
    attachments_count: 0,
  },
  {
    id: 'rep-uuid-0892',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0892',
    report_type: 'Unsafe Act',
    site_id: 'site-digboi-01',
    location_id: 'loc-02',
    activity_id: 'act-02',
    report_datetime: '2026-09-18T15:00:00.000Z',
    description: 'Scaffolding tie-off compromised during structural platform modification at elevation.',
    actual_outcome: 'Auditor stopped work; static lifeline installed before resuming.',
    processing_status: 'ANALYZED',
    review_status: 'Verified SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-18T15:05:00.000Z',
    updated_at: '2026-09-18T15:10:00.000Z',
    site: SITES[0],
    location: LOCATIONS[1],
    activity: ACTIVITIES[1],
    attachments_count: 1,
  },
  {
    id: 'rep-uuid-0893',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0893',
    report_type: 'Near-Miss',
    site_id: 'site-moran-02',
    location_id: 'loc-04',
    activity_id: 'act-01',
    report_datetime: '2026-09-18T16:00:00.000Z',
    description: 'Mud circulation line valve seal failed during high-rate pumping operation.',
    actual_outcome: 'Pressure dumped safely to reserve pit; no personnel in splash zone.',
    processing_status: 'ANALYZED',
    review_status: 'Verified SIF',
    source: 'PORTAL_WEB',
    created_at: '2026-09-18T16:05:00.000Z',
    updated_at: '2026-09-18T16:10:00.000Z',
    site: SITES[1],
    location: LOCATIONS[3],
    activity: ACTIVITIES[0],
    attachments_count: 0,
  },
  {
    id: 'rep-uuid-0894',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0894',
    report_type: 'Unsafe Condition',
    site_id: 'site-duliajan-03',
    location_id: 'loc-07',
    activity_id: 'act-03',
    report_datetime: '2026-09-18T17:00:00.000Z',
    description: 'Electrical isolation interlock switch malfunction on mud agitator panel.',
    actual_outcome: 'Lockout tagout confirmed manually with circuit breaker padlock.',
    processing_status: 'ANALYZED',
    review_status: 'Action Assigned',
    source: 'PORTAL_WEB',
    created_at: '2026-09-18T17:05:00.000Z',
    updated_at: '2026-09-18T17:10:00.000Z',
    site: SITES[2],
    location: LOCATIONS[6],
    activity: ACTIVITIES[2],
    attachments_count: 0,
  },
  {
    id: 'rep-uuid-0895',
    organization_id: 'oil-india-demo',
    report_number: 'REP-2026-0895',
    report_type: 'Near-Miss',
    site_id: 'site-numaligarh-04',
    location_id: 'loc-10',
    activity_id: 'act-01',
    report_datetime: '2026-09-18T18:00:00.000Z',
    description: 'High pressure manifold flanged joint showed micro-fracture during hydrostatic pressure test.',
    actual_outcome: 'Automated pressure relief opened; line depressurized immediately.',
    processing_status: 'ANALYZED',
    review_status: 'Under Review',
    source: 'PORTAL_WEB',
    created_at: '2026-09-18T18:05:00.000Z',
    updated_at: '2026-09-18T18:10:00.000Z',
    site: SITES[3],
    location: LOCATIONS[9],
    activity: ACTIVITIES[0],
    attachments_count: 0,
  },
];

class SafetyDataStore {
  private reports: Map<string, ReportRecord> = new Map();
  private analyses: Map<string, SafetyAnalysisResult[]> = new Map();
  private audits: Map<string, AuditRecord[]> = new Map();
  private riskAssessments: Map<string, RiskAssessmentRecord[]> = new Map();
  private riskPolicies: Map<string, RiskPolicy> = new Map();
  private vectorStore: IVectorStore;
  private embeddingService: EmbeddingService;
  private similaritySearchService: SimilaritySearchService;
  private reportSeq = 1040;

  constructor() {
    // Initialize default risk policy
    this.riskPolicies.set(DEFAULT_RISK_POLICY.id, DEFAULT_RISK_POLICY);
    this.riskPolicies.set(DEFAULT_RISK_POLICY.version, DEFAULT_RISK_POLICY);

    // Initialize Phase 7 Vector Store & Similarity Search Service
    this.vectorStore = new FaissVectorStore(128);
    this.embeddingService = embeddingService;
    this.similaritySearchService = new SimilaritySearchService(
      this.vectorStore,
      this.embeddingService,
      (id) => this.getReportById(id)
    );

    // Seed initial reports with pre-calculated safety analyses, Phase 6 risk assessments, and Phase 7 vectors
    for (const r of INITIAL_REPORTS) {
      this.reports.set(r.id, r);
      this.reports.set(r.report_number, r);

      const analysis = evaluateSafetyNarrativeDeterministic(r.id, r.description, r.actual_outcome);
      r.latest_analysis = analysis;
      this.analyses.set(r.id, [analysis]);

      // Phase 6 Risk Assessment
      const riskAssessment = riskIntelligenceService.assessRisk(r.id, r.description, analysis, {
        policy: DEFAULT_RISK_POLICY,
      });
      r.latest_risk_assessment = riskAssessment;
      this.riskAssessments.set(r.id, [riskAssessment]);

      // Phase 7 Vector Embedding
      const semDoc = this.embeddingService.prepareSemanticDocument(r, analysis);
      // Synchronously generate initial deterministic domain vector for instant startup
      const vector = (this.embeddingService as any).generateDeterministicDomainVector(
        semDoc.semantic_text,
        128
      );
      const vectorDoc: VectorDocument = {
        id: `vec-${r.id}`,
        numeric_id: 0,
        report_id: r.id,
        organization_id: r.organization_id || 'oil-india-demo',
        vector,
        content_hash: semDoc.content_hash,
        document_version: semDoc.document_version,
        model_name: this.embeddingService.getConfig().model,
        model_version: this.embeddingService.getConfig().modelVersion,
        dimension: 128,
        status: 'INDEXED',
        created_at: r.created_at,
        updated_at: r.updated_at,
        metadata: semDoc.metadata,
      };

      r.embedding_status = 'INDEXED';
      r.embedding_content_hash = semDoc.content_hash;
      r.embedding_version = semDoc.document_version;

      this.vectorStore.upsert(vectorDoc);

      this.audits.set(r.id, [
        {
          id: `aud-${Math.random().toString(36).substring(2, 8)}`,
          report_id: r.id,
          event_type: 'REPORT_SUBMITTED',
          action_summary: 'Report submitted via SUCHAK Safety Intelligence Portal',
          actor_name: 'HSE Field Inspector',
          created_at: r.created_at,
        },
        {
          id: `aud-${Math.random().toString(36).substring(2, 8)}`,
          report_id: r.id,
          event_type: 'ANALYSIS_COMPLETED',
          action_summary: `Safety NLP classification generated (${analysis.classification})`,
          actor_name: 'SUCHAK Safety Engine',
          created_at: r.updated_at,
        },
        {
          id: `aud-${Math.random().toString(36).substring(2, 8)}`,
          report_id: r.id,
          event_type: 'RISK_ASSESSMENT_COMPLETED',
          action_summary: `Phase 6 SIF Risk Priority calculated: ${riskAssessment.score}/100 (${riskAssessment.priority}) under Policy v${riskAssessment.policy_version}`,
          actor_name: 'SUCHAK Risk Engine',
          created_at: r.updated_at,
        },
        {
          id: `aud-${Math.random().toString(36).substring(2, 8)}`,
          report_id: r.id,
          event_type: 'REPORT_INDEXED',
          action_summary: `Phase 7 Vector Document created and indexed into FAISS vector store (${vectorDoc.model_name})`,
          actor_name: 'SUCHAK Vector Indexer',
          created_at: r.updated_at,
        },
      ]);
    }

    // Run initial Phase 8 Precursor Pattern Discovery on demo organization
    try {
      this.discoverPatternsSync('oil-india-demo');
    } catch (err) {
      console.warn('[SafetyDataStore] Initial pattern discovery failed:', err);
    }

    // Initialize Phase 9 Human Review Queue for eligible reports
    try {
      reviewStore.initializeQueueForReports(Array.from(this.reports.values()));
    } catch (err) {
      console.warn('[SafetyDataStore] Initial review queue initialization failed:', err);
    }
  }

  getSites(): SiteRecord[] {
    return SITES;
  }

  getLocations(siteId?: string): LocationRecord[] {
    if (!siteId) return LOCATIONS;
    return LOCATIONS.filter((l) => l.site_id === siteId || l.site_id.includes(siteId));
  }

  getActivities(): ActivityRecord[] {
    return ACTIVITIES;
  }

  getReportTypes() {
    return REPORT_TYPES;
  }

  listReports(filters: {
    search?: string;
    site_id?: string;
    report_type?: string;
    review_status?: string;
    page?: number;
    page_size?: number;
  }) {
    let list = Array.from(new Set(this.reports.values()));

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.report_number.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.site?.name && r.site.name.toLowerCase().includes(q)) ||
          (r.activity?.name && r.activity.name.toLowerCase().includes(q))
      );
    }

    if (filters.site_id && filters.site_id !== 'ALL') {
      list = list.filter((r) => r.site_id === filters.site_id || r.site?.code === filters.site_id);
    }

    if (filters.report_type && filters.report_type !== 'ALL') {
      const target = filters.report_type.toLowerCase().replace('-', ' ').replace('_', ' ');
      list = list.filter((r) => r.report_type.toLowerCase().replace('-', ' ').replace('_', ' ') === target);
    }

    if (filters.review_status && filters.review_status !== 'ALL') {
      list = list.filter((r) => r.review_status.toLowerCase() === filters.review_status!.toLowerCase());
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = list.length;
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.page_size || 20));
    const start = (page - 1) * pageSize;
    const items = list.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    };
  }

  getAllReports(): ReportRecord[] {
    return Array.from(new Set(this.reports.values()));
  }

  getReportById(identifier: string): ReportRecord | null {
    const report = this.reports.get(identifier);
    if (!report) return null;

    // Attach site & activity if missing
    if (!report.site) {
      report.site = SITES.find((s) => s.id === report.site_id || s.code === report.site_id) || SITES[0];
    }
    if (!report.activity && report.activity_id) {
      report.activity = ACTIVITIES.find((a) => a.id === report.activity_id || a.code === report.activity_id) || null;
    }
    return report;
  }

  getAuditHistory(reportId: string): AuditRecord[] {
    const report = this.getReportById(reportId);
    if (!report) return [];
    return (
      this.audits.get(report.id) || [
        {
          id: `aud-${Math.random().toString(36).substring(2, 8)}`,
          report_id: report.id,
          event_type: 'REPORT_SUBMITTED',
          action_summary: 'Report recorded in persistent state',
          actor_name: 'Field Officer',
          created_at: report.created_at,
        },
      ]
    );
  }

  async createReport(data: {
    report_type: string;
    description: string;
    actual_outcome?: string | null;
    site_id?: string;
    location_id?: string;
    activity_id?: string;
    report_datetime?: string;
    source?: string;
    organization_id?: string;
    source_system?: string;
    source_record_id?: string;
    source_schema_version?: string;
    connector_id?: string;
    data_classification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
    provenance_type?: 'SOURCE_DATA' | 'AI_GENERATED' | 'HUMAN_CORRECTED' | 'DERIVED' | 'SYSTEM_GENERATED';
    legal_hold?: boolean;
    retention_expires_at?: string;
  }): Promise<ReportRecord> {
    const seq = this.reportSeq++;
    const reportNumber = `REP-2026-${seq.toString().padStart(4, '0')}`;
    const id = `rep-uuid-${Math.random().toString(36).substring(2, 10)}`;
    const nowIso = new Date().toISOString();

    const site =
      SITES.find((s) => s.id === data.site_id || s.code === data.site_id) ||
      SITES[0];
    const location =
      LOCATIONS.find((l) => l.id === data.location_id || l.site_id === site.id) ||
      LOCATIONS.find((l) => l.site_id === site.id) ||
      LOCATIONS[0];
    const activity =
      ACTIVITIES.find((a) => a.id === data.activity_id || a.code === data.activity_id) ||
      ACTIVITIES[0];

    const report: ReportRecord = {
      id,
      organization_id: data.organization_id || 'oil-india-demo',
      report_number: reportNumber,
      report_type: data.report_type || 'Near-Miss',
      site_id: site.id,
      location_id: location.id,
      activity_id: activity.id,
      report_datetime: data.report_datetime || nowIso,
      description: data.description,
      actual_outcome: data.actual_outcome || null,
      processing_status: 'ANALYZED',
      review_status: 'Under Review',
      source: data.source || 'MANUAL',
      created_at: nowIso,
      updated_at: nowIso,
      site,
      location,
      activity,
      attachments_count: 0,
      source_system: data.source_system,
      source_record_id: data.source_record_id,
      source_schema_version: data.source_schema_version,
      connector_id: data.connector_id,
      data_classification: data.data_classification || 'INTERNAL',
      provenance_type: data.provenance_type || 'SOURCE_DATA',
      legal_hold: data.legal_hold || false,
      retention_expires_at: data.retention_expires_at,
    };

    // Run AI safety analysis
    const analysis = await analyzeReportSafety(id, data.description, data.actual_outcome);
    report.latest_analysis = analysis;

    // Phase 6: Run Risk Intelligence Prioritization
    const riskAssessment = riskIntelligenceService.assessRisk(id, data.description, analysis, {
      policy: this.getActivePolicy(),
    });
    report.latest_risk_assessment = riskAssessment;

    this.reports.set(id, report);
    this.reports.set(reportNumber, report);
    this.analyses.set(id, [analysis]);
    this.riskAssessments.set(id, [riskAssessment]);

    this.audits.set(id, [
      {
        id: `aud-${Math.random().toString(36).substring(2, 8)}`,
        report_id: id,
        event_type: 'REPORT_SUBMITTED',
        action_summary: `Safety observation recorded (${reportNumber})`,
        actor_name: 'HSE Safety Officer',
        created_at: nowIso,
      },
      {
        id: `aud-${Math.random().toString(36).substring(2, 8)}`,
        report_id: id,
        event_type: 'ANALYSIS_TRIGGERED',
        action_summary: `Safety AI Engine classified as ${analysis.classification} (${analysis.priority})`,
        actor_name: 'SUCHAK Intelligence Engine',
        created_at: nowIso,
      },
      {
        id: `aud-${Math.random().toString(36).substring(2, 8)}`,
        report_id: id,
        event_type: 'RISK_ASSESSMENT_COMPLETED',
        action_summary: `SIF Precursor Priority calculated: ${riskAssessment.score}/100 (${riskAssessment.priority}) [Policy v${riskAssessment.policy_version}]`,
        actor_name: 'SUCHAK Risk Engine',
        created_at: nowIso,
      },
    ]);

    // Phase 7: Generate Semantic Embedding and Index in Vector Store
    try {
      const semDoc = this.embeddingService.prepareSemanticDocument(report, analysis);
      const vector = (this.embeddingService as any).generateDeterministicDomainVector(
        semDoc.semantic_text,
        128
      );
      const vectorDoc: VectorDocument = {
        id: `vec-${id}`,
        numeric_id: 0,
        report_id: id,
        organization_id: report.organization_id || 'oil-india-demo',
        vector,
        content_hash: semDoc.content_hash,
        document_version: semDoc.document_version,
        model_name: this.embeddingService.getConfig().model,
        model_version: this.embeddingService.getConfig().modelVersion,
        dimension: 128,
        status: 'INDEXED',
        created_at: nowIso,
        updated_at: nowIso,
        metadata: semDoc.metadata,
      };

      report.embedding_status = 'INDEXED';
      report.embedding_content_hash = semDoc.content_hash;
      report.embedding_version = semDoc.document_version;

      await this.vectorStore.upsert(vectorDoc);

      const audList = this.audits.get(id) || [];
      audList.push({
        id: `aud-${Math.random().toString(36).substring(2, 8)}`,
        report_id: id,
        event_type: 'REPORT_INDEXED',
        action_summary: `Vector Document indexed into FAISS vector store (${vectorDoc.model_name})`,
        actor_name: 'SUCHAK Vector Indexer',
        created_at: nowIso,
      });
      this.audits.set(id, audList);
    } catch (err) {
      console.warn('[SUCHAK] Vector indexing failed during createReport:', err);
      report.embedding_status = 'INDEX_FAILED';
    }

    try {
      reviewStore.initializeQueueForReports([report]);
    } catch (err) {
      console.warn('[SUCHAK] Review queue sync failed during createReport:', err);
    }

    return report;
  }

  updateReport(
    identifier: string,
    updates: Partial<Pick<ReportRecord, 'description' | 'actual_outcome' | 'review_status' | 'processing_status'>>
  ): ReportRecord | null {
    const report = this.getReportById(identifier);
    if (!report) return null;

    let contentChanged = false;
    if (updates.description !== undefined && updates.description !== report.description) {
      report.description = updates.description;
      contentChanged = true;
    }
    if (updates.actual_outcome !== undefined && updates.actual_outcome !== report.actual_outcome) {
      report.actual_outcome = updates.actual_outcome;
      contentChanged = true;
    }
    if (updates.review_status !== undefined) report.review_status = updates.review_status;
    if (updates.processing_status !== undefined) report.processing_status = updates.processing_status;

    if (contentChanged) {
      report.embedding_status = 'STALE';
      try {
        reviewStore.initializeQueueForReports([report]);
      } catch (err) {
        console.warn('[SUCHAK] Review queue sync failed during updateReport:', err);
      }
    }

    report.updated_at = new Date().toISOString();
    return report;
  }

  async runAnalysis(identifier: string, force = false): Promise<SafetyAnalysisResult | null> {
    const report = this.getReportById(identifier);
    if (!report) return null;

    const existing = this.analyses.get(report.id) || [];
    if (!force && existing.length > 0) {
      return existing[existing.length - 1];
    }

    const analysis = await analyzeReportSafety(report.id, report.description, report.actual_outcome);
    existing.push(analysis);
    this.analyses.set(report.id, existing);
    report.latest_analysis = analysis;
    report.processing_status = 'ANALYZED';
    report.updated_at = new Date().toISOString();

    try {
      reviewStore.initializeQueueForReports([report]);
    } catch (err) {
      console.warn('[SUCHAK] Review queue sync failed during runAnalysis:', err);
    }

    const currentAudits = this.audits.get(report.id) || [];
    currentAudits.push({
      id: `aud-${Math.random().toString(36).substring(2, 8)}`,
      report_id: report.id,
      event_type: 'REANALYSIS_EXECUTED',
      action_summary: `Re-evaluated via NLP model: ${analysis.classification}`,
      actor_name: 'SUCHAK Engine',
      created_at: new Date().toISOString(),
    });
    this.audits.set(report.id, currentAudits);

    return analysis;
  }

  getLatestAnalysis(identifier: string): SafetyAnalysisResult | null {
    const report = this.getReportById(identifier);
    if (!report) return null;

    if (report.latest_analysis) return report.latest_analysis;
    const history = this.analyses.get(report.id) || [];
    return history[history.length - 1] || null;
  }

  getAnalysisHistory(identifier: string): SafetyAnalysisResult[] {
    const report = this.getReportById(identifier);
    if (!report) return [];
    return this.analyses.get(report.id) || [];
  }

  /* -------------------------------------------------------------------------- */
  /* PHASE 6: RISK INTELLIGENCE & SIF PRIORITIZATION METHODS                     */
  /* -------------------------------------------------------------------------- */

  getLatestRiskAssessment(identifier: string): RiskAssessmentRecord | null {
    const report = this.getReportById(identifier);
    if (!report) return null;

    if (report.latest_risk_assessment) return report.latest_risk_assessment;
    const history = this.riskAssessments.get(report.id) || [];
    return history[history.length - 1] || null;
  }

  getRiskAssessmentHistory(identifier: string): RiskAssessmentRecord[] {
    const report = this.getReportById(identifier);
    if (!report) return [];
    return this.riskAssessments.get(report.id) || [];
  }

  calculateOrRecalculateRisk(
    identifier: string,
    options?: {
      forceRecalculate?: boolean;
      policyVersion?: string;
    }
  ): { assessment: RiskAssessmentRecord; createdNew: boolean } | null {
    const report = this.getReportById(identifier);
    if (!report) return null;

    const policy = options?.policyVersion
      ? this.getPolicy(options.policyVersion) || this.getActivePolicy()
      : this.getActivePolicy();

    const history = this.riskAssessments.get(report.id) || [];
    const latestAnalysis = this.getLatestAnalysis(report.id);

    // Idempotency check: If an assessment already exists for the same report and policy, and not forcing recalculation
    if (!options?.forceRecalculate && history.length > 0) {
      const existing = history[history.length - 1];
      if (existing.risk_policy_version_id === policy.id || existing.policy_version === policy.version) {
        return { assessment: existing, createdNew: false };
      }
    }

    // Safety dependency check: Valid Phase 4/5 analysis is required
    if (!latestAnalysis) {
      const unavailable = riskIntelligenceService.assessRisk(report.id, report.description, null, {
        policy,
      });
      return { assessment: unavailable, createdNew: false };
    }

    // Run calculation
    const assessment = riskIntelligenceService.assessRisk(report.id, report.description, latestAnalysis, {
      policy,
      isRecalculation: options?.forceRecalculate,
    });

    // Preserve previous assessments and append new one
    history.push(assessment);
    this.riskAssessments.set(report.id, history);
    report.latest_risk_assessment = assessment;
    report.updated_at = new Date().toISOString();

    // Audit logging
    const eventType = options?.forceRecalculate
      ? 'RISK_ASSESSMENT_RECALCULATED'
      : 'RISK_ASSESSMENT_COMPLETED';
    const auditRecord: AuditRecord = {
      id: `aud-${Math.random().toString(36).substring(2, 8)}`,
      report_id: report.id,
      event_type: eventType,
      action_summary: `Risk Priority ${options?.forceRecalculate ? 'recalculated' : 'evaluated'}: ${assessment.score}/100 (${assessment.priority}) under Policy v${policy.version}`,
      actor_name: 'SUCHAK Risk Engine',
      created_at: assessment.calculated_at,
    };

    const currentAudits = this.audits.get(report.id) || [];
    currentAudits.push(auditRecord);
    this.audits.set(report.id, currentAudits);

    return { assessment, createdNew: true };
  }

  getActivePolicy(): RiskPolicy {
    return this.riskPolicies.get(DEFAULT_RISK_POLICY.id) || DEFAULT_RISK_POLICY;
  }

  getPolicy(versionOrId: string): RiskPolicy | null {
    return this.riskPolicies.get(versionOrId) || null;
  }

  listPolicies(): RiskPolicy[] {
    return Array.from(new Set(this.riskPolicies.values()));
  }

  updatePolicy(policyData: Partial<RiskPolicy>): { success: boolean; policy?: RiskPolicy; errors?: string[] } {
    const validation = validateRiskPolicy(policyData);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const current = this.getActivePolicy();
    const updated: RiskPolicy = {
      ...current,
      ...policyData,
      id: policyData.id || `pol-suchak-${Math.random().toString(36).substring(2, 8)}`,
      created_at: new Date().toISOString(),
      effective_at: new Date().toISOString(),
    } as RiskPolicy;

    this.riskPolicies.set(updated.id, updated);
    this.riskPolicies.set(updated.version, updated);

    return { success: true, policy: updated };
  }

  getSiteRiskAggregations(options?: {
    organization_id?: string;
    start_date?: string;
    end_date?: string;
    window_preset?: string;
    min_sample?: number;
  }): SiteRiskAggregation[] {
    const allReports = Array.from(new Set(this.reports.values()));
    return riskAggregationService.calculateSiteAggregations(
      SITES,
      allReports,
      (reportId) => this.getLatestRiskAssessment(reportId),
      options
    );
  }

  getActivityRiskAggregations(options?: {
    organization_id?: string;
    start_date?: string;
    end_date?: string;
    window_preset?: string;
    min_sample?: number;
  }): ActivityRiskAggregation[] {
    const allReports = Array.from(new Set(this.reports.values()));
    return riskAggregationService.calculateActivityAggregations(
      ACTIVITIES,
      allReports,
      (reportId) => this.getLatestRiskAssessment(reportId),
      options
    );
  }

  validateCsvContent(csvContent: string) {
    const lines = csvContent.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      return {
        total_rows: 0,
        valid_count: 0,
        invalid_count: 0,
        validated_items: [],
        errors: [{ row: 1, error: 'Empty file or only header present.' }],
      };
    }

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
    const rows = lines.slice(1);
    const validated_items: Array<{
      report_number?: string;
      report_type: string;
      description: string;
      site_id?: string;
      site_code?: string;
      report_datetime?: string;
      valid?: boolean;
      errors?: string[];
    }> = [];
    const errors: Array<{ row: number; error: string }> = [];

    const typeIdx = header.findIndex((h) => h.includes('type'));
    const descIdx = header.findIndex((h) => h.includes('desc'));
    const siteIdx = header.findIndex((h) => h.includes('site'));
    const dateIdx = header.findIndex((h) => h.includes('date') || h.includes('time'));

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const line = rows[i];
      // Basic CSV splitter respecting quoted strings
      const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const cleanParts = parts.map((p) => p.replace(/^"|"$/g, '').trim());

      const report_type = typeIdx >= 0 ? cleanParts[typeIdx] || 'Near Miss' : 'Near Miss';
      const description = descIdx >= 0 ? cleanParts[descIdx] || '' : cleanParts[1] || '';
      const site_code = siteIdx >= 0 ? cleanParts[siteIdx] || 'RIG-DIGBOI-04' : 'RIG-DIGBOI-04';
      const report_datetime = dateIdx >= 0 ? cleanParts[dateIdx] : new Date().toISOString();

      const rowErrors: string[] = [];
      if (!description || description.length < 5) {
        rowErrors.push('Description is required (minimum 5 characters)');
        errors.push({ row: rowNum, error: 'Missing or short description' });
      }

      validated_items.push({
        report_type,
        description,
        site_code,
        report_datetime,
        valid: rowErrors.length === 0,
        errors: rowErrors.length > 0 ? rowErrors : undefined,
      });
    }

    const valid_count = validated_items.filter((item) => item.valid).length;
    return {
      total_rows: rows.length,
      valid_count,
      invalid_count: rows.length - valid_count,
      validated_items,
      errors,
    };
  }

  async commitBulkUpload(
    items: Array<{
      report_type: string;
      description: string;
      site_code?: string;
      site_id?: string;
      report_datetime?: string;
    }>
  ) {
    const importedIds: string[] = [];
    for (const item of items) {
      if (!item.description || item.description.trim().length === 0) continue;
      const matchedSite =
        SITES.find((s) => s.code === item.site_code || s.id === item.site_id) || SITES[0];
      const report = await this.createReport({
        report_type: item.report_type || 'Near Miss',
        description: item.description,
        site_id: matchedSite.id,
        report_datetime: item.report_datetime,
        source: 'BULK_CSV_IMPORT',
      });
      importedIds.push(report.report_number);
    }
    return {
      total_imported: importedIds.length,
      imported_ids: importedIds,
    };
  }

  getAnalyticsOverview() {
    const all = Array.from(new Set(this.reports.values()));
    const sifCount = all.filter(
      (r) => r.latest_analysis?.classification === 'SIF_POTENTIAL' || r.latest_analysis?.sif_potential
    ).length;
    const highPriorityCount = all.filter(
      (r) => r.latest_analysis?.priority === 'CRITICAL' || r.latest_analysis?.priority === 'HIGH'
    ).length;

    return {
      totalReports: all.length + 1420, // Baseline scale representation
      sifPotentialCount: sifCount + 80,
      highPriorityCount: highPriorityCount + 16,
      openActionsCount: 42,
      recurringPatternsCount: 7,
      sitesMonitoredCount: SITES.length + 10,
    };
  }

  /* -------------------------------------------------------------------------- */
  /* PHASE 7: VECTOR SIMILARITY, EMBEDDINGS & SEMANTIC RETRIEVAL                 */
  /* -------------------------------------------------------------------------- */

  async getSimilarReports(reportId: string, options?: SimilarSearchOptions) {
    const report = this.getReportById(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const result = await this.similaritySearchService.findSimilarReports(report.id, options);

    // Audit trail
    const audList = this.audits.get(report.id) || [];
    audList.push({
      id: `aud-${Math.random().toString(36).substring(2, 8)}`,
      report_id: report.id,
      event_type: 'SEMANTIC_SEARCH_EXECUTED',
      action_summary: `Phase 7 Vector Similarity Search retrieved ${result.similar_reports.length} matching reports (top score: ${result.similar_reports[0]?.similarity || 0})`,
      actor_name: 'SUCHAK Similarity Service',
      created_at: new Date().toISOString(),
    });
    this.audits.set(report.id, audList);

    return result;
  }

  async searchSemantic(query: string, options?: SimilarSearchOptions): Promise<SemanticSearchResponse> {
    return this.similaritySearchService.searchByFreeText(query, options);
  }

  async indexReport(reportId: string): Promise<{ success: boolean; vectorDoc?: VectorDocument; error?: string }> {
    const report = this.getReportById(reportId);
    if (!report) {
      return { success: false, error: `Report '${reportId}' not found` };
    }

    try {
      const analysis = report.latest_analysis || evaluateSafetyNarrativeDeterministic(report.id, report.description, report.actual_outcome);
      const semDoc = this.embeddingService.prepareSemanticDocument(report, analysis);
      const vector = await this.embeddingService.generateEmbedding(semDoc.semantic_text);

      const vectorDoc: VectorDocument = {
        id: `vec-${report.id}`,
        numeric_id: 0,
        report_id: report.id,
        organization_id: report.organization_id || 'oil-india-demo',
        vector,
        content_hash: semDoc.content_hash,
        document_version: semDoc.document_version,
        model_name: this.embeddingService.getConfig().model,
        model_version: this.embeddingService.getConfig().modelVersion,
        dimension: this.embeddingService.getConfig().dimension,
        status: 'INDEXED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: semDoc.metadata,
      };

      await this.vectorStore.upsert(vectorDoc);
      report.embedding_status = 'INDEXED';
      report.embedding_content_hash = semDoc.content_hash;
      report.embedding_version = semDoc.document_version;

      const audList = this.audits.get(report.id) || [];
      audList.push({
        id: `aud-${Math.random().toString(36).substring(2, 8)}`,
        report_id: report.id,
        event_type: 'REPORT_INDEXED',
        action_summary: `Vector Document indexed into FAISS vector store (${vectorDoc.model_name})`,
        actor_name: 'SUCHAK Vector Indexer',
        created_at: new Date().toISOString(),
      });
      this.audits.set(report.id, audList);

      return { success: true, vectorDoc };
    } catch (err: any) {
      report.embedding_status = 'INDEX_FAILED';
      return { success: false, error: err.message || 'Indexing failed' };
    }
  }

  async reindexReport(reportId: string): Promise<{ success: boolean; vectorDoc?: VectorDocument; error?: string }> {
    const report = this.getReportById(reportId);
    if (!report) {
      return { success: false, error: `Report '${reportId}' not found` };
    }

    const res = await this.indexReport(report.id);
    if (res.success) {
      const audList = this.audits.get(report.id) || [];
      audList.push({
        id: `aud-${Math.random().toString(36).substring(2, 8)}`,
        report_id: report.id,
        event_type: 'REPORT_REINDEXED',
        action_summary: `Vector Document explicitly reindexed (Hash: ${res.vectorDoc?.content_hash.substring(0, 8)}...)`,
        actor_name: 'SUCHAK Vector Indexer',
        created_at: new Date().toISOString(),
      });
      this.audits.set(report.id, audList);
    }
    return res;
  }

  async rebuildVectorIndex(): Promise<{ success: boolean; total_indexed: number; duration_ms: number }> {
    const startTime = Date.now();
    const all = Array.from(new Set(this.reports.values()));
    const docs: VectorDocument[] = [];

    for (const report of all) {
      const analysis = report.latest_analysis || evaluateSafetyNarrativeDeterministic(report.id, report.description, report.actual_outcome);
      const semDoc = this.embeddingService.prepareSemanticDocument(report, analysis);
      const vector = (this.embeddingService as any).generateDeterministicDomainVector(
        semDoc.semantic_text,
        this.embeddingService.getConfig().dimension
      );

      const vectorDoc: VectorDocument = {
        id: `vec-${report.id}`,
        numeric_id: 0,
        report_id: report.id,
        organization_id: report.organization_id || 'oil-india-demo',
        vector,
        content_hash: semDoc.content_hash,
        document_version: semDoc.document_version,
        model_name: this.embeddingService.getConfig().model,
        model_version: this.embeddingService.getConfig().modelVersion,
        dimension: this.embeddingService.getConfig().dimension,
        status: 'INDEXED',
        created_at: report.created_at,
        updated_at: new Date().toISOString(),
        metadata: semDoc.metadata,
      };

      report.embedding_status = 'INDEXED';
      report.embedding_content_hash = semDoc.content_hash;
      report.embedding_version = semDoc.document_version;

      docs.push(vectorDoc);
    }

    await this.vectorStore.rebuild(docs);
    const duration = Date.now() - startTime;

    return {
      success: true,
      total_indexed: docs.length,
      duration_ms: duration,
    };
  }

  async getVectorStoreHealth(): Promise<VectorStoreHealth> {
    return this.vectorStore.healthCheck();
  }

  async getVectorConsistency(): Promise<VectorConsistencyReport> {
    const allReports = Array.from(new Set(this.reports.values()));
    const reportIds = allReports.map((r) => r.id);
    return this.vectorStore.verifyConsistency(reportIds);
  }

  async getVectorDocument(reportId: string): Promise<VectorDocument | null> {
    const report = this.getReportById(reportId);
    if (!report) return null;
    return this.vectorStore.getMapping(report.id);
  }

  getEmbeddingDocument(reportId: string): SemanticDocument | null {
    const report = this.getReportById(reportId);
    if (!report) return null;
    return this.embeddingService.prepareSemanticDocument(report, report.latest_analysis);
  }

  /* -------------------------------------------------------------------------- */
  /* PHASE 8: RECURRING PRECURSOR PATTERN DISCOVERY                             */
  /* -------------------------------------------------------------------------- */

  public discoverPatternsSync(organizationId: string, options?: Partial<DiscoveryConfiguration>): {
    success: boolean;
    patterns_count: number;
    run_id: string;
    duration_ms: number;
  } {
    const startTime = Date.now();
    const runId = `run-${Math.random().toString(36).substring(2, 9)}`;
    const config: DiscoveryConfiguration = {
      ...DEFAULT_DISCOVERY_CONFIG,
      ...options,
    };

    // Strict Tenant Isolation: select only reports belonging to organization
    const all = Array.from(new Set(this.reports.values())).filter(
      (r) =>
        (r.organization_id || 'oil-india-demo') === organizationId &&
        r.processing_status !== 'ARCHIVED' &&
        r.processing_status !== 'DELETED'
    );

    // Build features for each eligible report
    const features: PatternFeatureRepresentation[] = all.map((r) => {
      const vecDoc = this.vectorStore.getMappingSync(r.id);
      return PatternFeatureBuilder.buildFeature(r, r.latest_analysis, vecDoc);
    });

    const runRecord: DiscoveryRun = {
      run_id: runId,
      organization_id: organizationId,
      start_time: new Date(startTime).toISOString(),
      end_time: null,
      algorithm_version: config.algorithm_version,
      configuration: config,
      input_reports_count: this.reports.size,
      eligible_reports_count: all.length,
      patterns_discovered: 0,
      status: 'RUNNING',
    };
    patternStore.recordDiscoveryRun(runRecord);

    try {
      const discovered = patternDiscoveryEngine.discover(
        organizationId,
        features,
        this.reports,
        runId
      );

      // Activate discovered patterns atomically
      patternStore.activatePatterns(organizationId, discovered);

      const duration = Date.now() - startTime;
      runRecord.status = 'COMPLETED';
      runRecord.end_time = new Date().toISOString();
      runRecord.patterns_discovered = discovered.length;
      runRecord.duration_ms = duration;
      patternStore.recordDiscoveryRun(runRecord);

      return {
        success: true,
        patterns_count: discovered.length,
        run_id: runId,
        duration_ms: duration,
      };
    } catch (err: any) {
      runRecord.status = 'FAILED';
      runRecord.end_time = new Date().toISOString();
      runRecord.error_message = err.message || 'Discovery run failed';
      runRecord.duration_ms = Date.now() - startTime;
      patternStore.recordDiscoveryRun(runRecord);
      throw err;
    }
  }

  public async discoverPatterns(organizationId: string, options?: Partial<DiscoveryConfiguration>) {
    return this.discoverPatternsSync(organizationId, options);
  }

  public async rebuildPatterns(organizationId: string, options?: Partial<DiscoveryConfiguration>) {
    return this.discoverPatternsSync(organizationId, options);
  }

  public getPatterns(
    organizationId: string,
    filters?: {
      status?: PatternStatus;
      pattern_type?: PatternType;
      site_id?: string;
      activity_id?: string;
      precursor?: string;
      hazard?: string;
      barrier_failure?: string;
      iogp_rule?: string;
      search?: string;
      min_strength?: number;
      sort_by?: 'pattern_strength' | 'support_count' | 'last_seen_at' | 'first_seen_at';
      sort_order?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }
  ) {
    return patternStore.getPatterns(organizationId, filters);
  }

  public getPatternById(organizationId: string, patternId: string) {
    return patternStore.getPatternById(organizationId, patternId);
  }

  public getPatternSummary(organizationId: string): PatternSummaryKPIs {
    return patternStore.getPatternSummary(organizationId);
  }

  public getDiscoveryRuns(organizationId: string): DiscoveryRun[] {
    return patternStore.getDiscoveryRuns(organizationId);
  }

  public getPatternsForReport(reportId: string, organizationId: string = 'oil-india-demo'): PrecursorPattern[] {
    const all = patternStore.getPatterns(organizationId, { limit: 100 }).patterns;
    return all.filter((p) => p.members.some((m) => m.report_id === reportId || m.report_number === reportId));
  }
}

export const dataStore = new SafetyDataStore();
