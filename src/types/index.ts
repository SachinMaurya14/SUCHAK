/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Core Type Definitions - Phase 1 Foundation
 */

export type UserRole = 
  | 'OrgAdmin'
  | 'HSEOfficer'
  | 'SafetyReviewer'
  | 'SiteManager';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  siteAccess: string[];
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type ReportType = 
  | 'Unsafe Act'
  | 'Unsafe Condition'
  | 'Near-Miss'
  | 'Incident';

export type ProcessingStatus = 
  | 'Pending'
  | 'Processing'
  | 'Classified'
  | 'Failed'
  | 'ANALYZED'
  | 'ANALYSIS_FAILED'
  | 'REVIEW_REQUIRED'
  | 'SUBMITTED'
  | 'DRAFT';

export type ReviewStatus = 
  | 'Unreviewed'
  | 'Under Review'
  | 'Verified SIF'
  | 'Overridden Non-SIF'
  | 'Action Assigned'
  | 'Closed';

export type SifPotential = 'SIF_POTENTIAL' | 'NON_SIF' | 'INCONCLUSIVE';

export type RiskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Normalized Report Data Contract
 */
export interface SafetyReport {
  id: string;
  organizationId: string;
  siteId: string;
  siteName: string;
  location: string;
  activity: string;
  reportType: ReportType;
  dateTime: string;
  reporter?: {
    anonymous: boolean;
    name?: string;
    department?: string;
    role?: string;
  };
  description: string;
  actualOutcome?: string;
  attachments?: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    url?: string;
  }[];
  processingStatus: ProcessingStatus;
  reviewStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  latestAnalysis?: BackendAnalysisResponse | null;
}

export interface BackendAnalysisResponse {
  id: string;
  report_id: string;
  model_version_id?: string | null;
  status: string;
  classification: 'SIF_POTENTIAL' | 'NON_SIF_POTENTIAL' | 'NEEDS_REVIEW';
  sif_potential?: boolean | null;
  confidence_estimate: number;
  confidence_band: 'LOW' | 'MEDIUM' | 'HIGH';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  safety_indicators: string[];
  hazards: string[];
  precursor_summary?: string | null;
  evidence: string[];
  actual_outcome?: string | null;
  potential_consequence?: string | null;
  explanation?: string | null;
  model_name?: string | null;
  model_version?: string | null;
  prompt_version?: string | null;
  analyzed_at?: string | null;
  created_at: string;
}

/**
 * Normalized AI Analysis Result Contract
 */
export interface AnalysisResult {
  report_id: string;
  sif_potential: SifPotential;
  confidence: number;
  priority: RiskPriority;
  sif_score: number;
  life_saving_rules: {
    rule_id: string;
    rule_name: string;
    relevance_score: number;
    icon?: string;
  }[];
  hazards: string[];
  precursors: string[];
  activity: string;
  location: string;
  barrier_failures: string[];
  evidence: {
    text_snippet: string;
    signal_type: string;
    weight: number;
  }[];
  explanation: string;
  similar_reports: {
    report_id: string;
    similarity_score: number;
    title: string;
  }[];
  pattern_ids: string[];
  model_version: string;
  analysis_timestamp: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  iconName: string;
  badge?: string;
  section: 'PRIMARY' | 'INTELLIGENCE' | 'HSE WORKFLOW' | 'DATA' | 'ADMIN';
  rolesAllowed?: UserRole[];
}

export interface HealthCheckResponse {
  status: string;
  app?: string;
  version?: string;
  phase?: string;
  architecture?: string;
  timestamp?: string;
}
