export const REPORT_EMBEDDING_DOCUMENT_VERSION = 'REPORT_EMBEDDING_DOCUMENT_V1';

export type IndexStatus = 'NOT_INDEXED' | 'INDEXING' | 'INDEXED' | 'INDEX_FAILED' | 'STALE';

export interface EmbeddingConfig {
  provider: string;
  model: string;
  modelVersion: string;
  dimension: number;
  batchSize: number;
  timeoutMs: number;
}

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: process.env.EMBEDDING_PROVIDER || 'suchak-domain-embeddings',
  model: process.env.EMBEDDING_MODEL || 'suchak-safety-embed-v1',
  modelVersion: '1.0.0',
  dimension: process.env.EMBEDDING_DIMENSION ? parseInt(process.env.EMBEDDING_DIMENSION, 10) : 128,
  batchSize: 10,
  timeoutMs: 5000,
};

export interface SemanticDocument {
  report_id: string;
  organization_id: string;
  document_version: string;
  semantic_text: string;
  content_hash: string;
  source_analysis_version?: string | null;
  metadata: {
    report_number: string;
    report_type: string;
    site_id: string;
    site_name: string;
    activity_id?: string | null;
    activity_name?: string | null;
    activity_category?: string | null;
    location_name?: string | null;
    hazards?: string[];
    sif_potential?: boolean;
    exposure_detected?: boolean;
    barrier_failure_detected?: boolean;
  };
}

export interface VectorDocument {
  id: string; // vector internal identifier, e.g. vec-xxx
  numeric_id: number; // FAISS-compatible sequential numeric ID
  report_id: string;
  organization_id: string;
  vector: number[];
  content_hash: string;
  document_version: string;
  model_name: string;
  model_version: string;
  dimension: number;
  status: IndexStatus;
  created_at: string;
  updated_at: string;
  metadata: SemanticDocument['metadata'];
}

export interface VectorSearchQuery {
  vector: number[];
  top_k: number;
  filters: {
    organization_id: string; // mandatory tenant isolation
    site_id?: string;
    activity_id?: string;
    report_type?: string;
    date_from?: string;
    date_to?: string;
    exclude_report_id?: string;
  };
}

export interface VectorSearchResult {
  document: VectorDocument;
  similarity: number; // normalized cosine similarity [0, 1]
}

export interface VectorStoreHealth {
  status: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  backend: string; // e.g. 'FAISS_INMEMORY_PERSISTENT'
  index_loaded: boolean;
  index_version: string;
  total_vectors: number;
  dimension: number;
  embedding_model: string;
  last_rebuilt_at: string | null;
  persistence_path: string;
}

export interface VectorConsistencyReport {
  is_consistent: boolean;
  total_reports_expected: number;
  total_vectors_indexed: number;
  missing_vectors: string[]; // report IDs missing vectors
  orphaned_vectors: string[]; // vector IDs with non-existent reports
  stale_vectors: string[]; // vectors needing reindexing
  model_mismatches: string[];
}

export interface SimilarityExplanation {
  similarity: number;
  reasons: string[];
  shared_factors: {
    activity_match: boolean;
    hazard_match: boolean;
    worker_exposure_match: boolean;
    barrier_failure_match: boolean;
    site_match: boolean;
    report_type_match: boolean;
  };
  summary: string;
}

export interface SimilarReportItem {
  report_id: string;
  report_number: string;
  report_type: string;
  site_id: string;
  site_name: string;
  activity_name: string;
  report_datetime: string;
  description_snippet: string;
  similarity: number; // 0.00 - 1.00
  similarity_label: string; // e.g. "High Similarity"
  why_similar: string[];
  explanation_summary: string;
}

export interface SemanticSearchResponse {
  query: string;
  total_matches: number;
  top_k: number;
  filters_applied: Record<string, any>;
  results: SimilarReportItem[];
  execution_time_ms: number;
  model: string;
  disclaimer: string;
}
