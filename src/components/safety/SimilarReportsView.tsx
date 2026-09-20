import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Info,
  Layers,
  FileCode,
  CheckCircle2,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  SimilarReportItem,
  SimilarReportsResponse,
  ReportEmbeddingMetadata,
} from '../../types';

interface SimilarReportsViewProps {
  reportId: string;
  reportNumber: string;
  onSelectReport?: (reportId: string) => void;
}

export const SimilarReportsView: React.FC<SimilarReportsViewProps> = ({
  reportId,
  reportNumber,
  onSelectReport,
}) => {
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SimilarReportsResponse | null>(null);
  const [embeddingMeta, setEmbeddingMeta] = useState<ReportEmbeddingMetadata | null>(null);
  const [showSemanticDoc, setShowSemanticDoc] = useState(false);

  // Filters
  const [topK, setTopK] = useState<number>(5);
  const [sameSiteOnly, setSameSiteOnly] = useState<boolean>(false);

  const fetchSimilar = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/v1/reports/${encodeURIComponent(reportId)}/similar?top_k=${topK}`;
      if (sameSiteOnly && data?.source_report?.site_id) {
        url += `&site_id=${encodeURIComponent(data.source_report.site_id)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load similar reports: ${res.statusText}`);
      }
      const json: SimilarReportsResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching similarity results');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmbeddingMeta = async () => {
    try {
      const res = await fetch(`/api/v1/reports/${encodeURIComponent(reportId)}/embedding`);
      if (res.ok) {
        const json = await res.json();
        setEmbeddingMeta(json);
      }
    } catch (err) {
      console.warn('Could not fetch embedding metadata:', err);
    }
  };

  useEffect(() => {
    fetchSimilar();
    fetchEmbeddingMeta();
  }, [reportId, topK, sameSiteOnly]);

  const handleReindex = async () => {
    try {
      setReindexing(true);
      const res = await fetch(`/api/v1/reports/${encodeURIComponent(reportId)}/reindex`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchEmbeddingMeta();
        await fetchSimilar();
      }
    } catch (err) {
      console.error('Reindexing failed:', err);
    } finally {
      setReindexing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return 'text-emerald-700 bg-emerald-50 border-emerald-300';
    if (score >= 0.75) return 'text-sky-700 bg-sky-50 border-sky-300';
    if (score >= 0.65) return 'text-amber-700 bg-amber-50 border-amber-300';
    return 'text-slate-700 bg-slate-100 border-slate-300';
  };

  return (
    <div id="similar-reports-view" className="space-y-6">
      {/* Header with Title & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Semantic Similar Reports</h2>
              <p className="text-sm text-slate-500">
                Vector space similarity matching using high-dimensional HSE ontology embeddings
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Top:</span>
            <select
              id="similar-topk-select"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          <button
            id="reindex-report-btn"
            onClick={handleReindex}
            disabled={reindexing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin' : ''}`} />
            {reindexing ? 'Reindexing...' : 'Reindex Vector'}
          </button>

          <button
            id="toggle-semantic-doc-btn"
            onClick={() => setShowSemanticDoc(!showSemanticDoc)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <FileCode className="w-3.5 h-3.5" />
            {showSemanticDoc ? 'Hide Vector Text' : 'View Vector Payload'}
          </button>
        </div>
      </div>

      {/* Safety & Methodological Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs leading-relaxed">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-950">Safety Retrieval Disclaimer: </span>
          Similarity is a semantic narrative retrieval measure reflecting textual and operational context concordance.
          It is explicitly separate from, and does not calculate, SIF classification, probability, or risk severity.
        </div>
      </div>

      {/* Embedding Metadata Drawer / Collapsible Box */}
      {showSemanticDoc && embeddingMeta && (
        <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono space-y-3 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Indexed Vector Document ({embeddingMeta.document_version || 'REPORT_EMBEDDING_DOCUMENT_V1'})
            </span>
            <span className="text-slate-400">Model: {embeddingMeta.model_name} ({embeddingMeta.dimension}-D)</span>
          </div>
          <div>
            <div className="text-slate-400 mb-1 font-semibold">Content Hash (SHA-256):</div>
            <div className="text-slate-300 bg-slate-800/80 p-2 rounded break-all select-all">
              {embeddingMeta.content_hash || 'Calculating...'}
            </div>
          </div>
          {embeddingMeta.semantic_document_text && (
            <div>
              <div className="text-slate-400 mb-1 font-semibold">Standardized Semantic Document:</div>
              <pre className="text-slate-300 bg-slate-800/80 p-3 rounded whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {embeddingMeta.semantic_document_text}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">Searching vector index for semantic matches...</p>
          <p className="text-xs text-slate-400 mt-1">Evaluating cosine distance across normalized HSE embeddings</p>
        </div>
      )}

      {/* Results List */}
      {!loading && data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {data.similar_reports.length} Similar Observation Records Found
            </span>
            <span className="text-xs text-slate-400">
              Embedding Model: {data.model}
            </span>
          </div>

          {data.similar_reports.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
              No similar reports found matching the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {data.similar_reports.map((sim, idx) => (
                <div
                  key={sim.report_id}
                  id={`similar-report-card-${sim.report_number}`}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-150 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    {/* Top Row: Report Number, Similarity Badge, Site & Activity */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                        <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                          {sim.report_number}
                        </span>
                        <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          {sim.report_type}
                        </span>
                      </div>

                      {/* Similarity Metric Badge */}
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(
                            sim.similarity
                          )}`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Similarity: {sim.similarity.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Metadata: Site and Activity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 font-medium">Site: </span>
                        <span className="font-semibold text-slate-800">{sim.site_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Activity: </span>
                        <span className="font-semibold text-slate-800">{sim.activity_name}</span>
                      </div>
                    </div>

                    {/* Description excerpt */}
                    <p className="text-sm text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-100/80 leading-relaxed">
                      "{sim.description_snippet}"
                    </p>

                    {/* Why Similar Explanation Bullets */}
                    {sim.why_similar && sim.why_similar.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Why similar:</span>
                        </div>
                        <ul className="space-y-1 pl-1">
                          {sim.why_similar.map((reason, rIdx) => (
                            <li
                              key={rIdx}
                              className="text-xs text-slate-700 flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(sim.report_datetime).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>

                    {onSelectReport ? (
                      <button
                        id={`view-report-btn-${sim.report_number}`}
                        onClick={() => onSelectReport(sim.report_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <span>View Report</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <a
                        href={`/reports/${sim.report_id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <span>View Report</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
