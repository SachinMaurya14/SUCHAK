import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Layers,
  Database,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ChevronRight,
  Info,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import {
  SemanticSearchResponse,
  SimilarReportItem,
  VectorHealthResponse,
  VectorConsistencyResponse,
} from '../types/index.ts';

interface SemanticSearchPageProps {
  onNavigate: (path: string) => void;
}

const SAMPLE_QUERIES = [
  'During maintenance, equipment remained energized while worker was exposed to machinery.',
  'Technician worked at height over 10m on monkey board without secondary lanyard attachment.',
  'Hydrostatic pressure proof test was conducted without barricades or whip-check safety cables.',
  'Hot work welding near hydrocarbon storage tank with flammable gas detector alarm.',
  'Excavation collapsed near pipeline trench trapping worker feet.',
];

export const SemanticSearchPage: React.FC<SemanticSearchPageProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState(
    'During maintenance, equipment remained energized while worker was exposed to machinery.'
  );
  const [topK, setTopK] = useState<number>(5);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SemanticSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vector Index Health & Consistency
  const [health, setHealth] = useState<VectorHealthResponse | null>(null);
  const [consistency, setConsistency] = useState<VectorConsistencyResponse | null>(null);
  const [rebuilding, setRebuilding] = useState<boolean>(false);
  const [checkingConsistency, setCheckingConsistency] = useState<boolean>(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/v1/vector/health');
      if (res.ok) {
        const json = await res.json();
        setHealth(json);
      }
    } catch (err) {
      console.warn('Could not fetch vector store health:', err);
    }
  };

  const handleRunConsistency = async () => {
    try {
      setCheckingConsistency(true);
      const res = await fetch('/api/v1/vector/consistency');
      if (res.ok) {
        const json = await res.json();
        setConsistency(json);
      }
    } catch (err) {
      console.warn('Could not check vector store consistency:', err);
    } finally {
      setCheckingConsistency(false);
    }
  };

  const handleRebuildIndex = async () => {
    try {
      setRebuilding(true);
      const res = await fetch('/api/v1/reports/rebuild-index', { method: 'POST' });
      if (res.ok) {
        await fetchHealth();
        await handleRunConsistency();
        handleSearch();
      }
    } catch (err) {
      console.error('Rebuilding index failed:', err);
    } finally {
      setRebuilding(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/v1/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          top_k: topK,
          site_id: selectedSite || undefined,
          activity_id: selectedActivity || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Search failed: ${res.statusText}`);
      }

      const json: SemanticSearchResponse = await res.json();
      setResults(json);
    } catch (err: any) {
      setError(err.message || 'Error executing semantic search');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    handleSearch();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return 'text-emerald-700 bg-emerald-50 border-emerald-300';
    if (score >= 0.75) return 'text-sky-700 bg-sky-50 border-sky-300';
    if (score >= 0.65) return 'text-amber-700 bg-amber-50 border-amber-300';
    return 'text-slate-700 bg-slate-100 border-slate-300';
  };

  return (
    <div id="semantic-search-page" className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Phase 7: Vector Semantic Search & Similarity Engine"
        subtitle="High-dimensional FAISS embedding retrieval across historical HSE incident repository"
        breadcrumbs={[{ label: 'Intelligence' }, { label: 'Vector Similarity' }]}
        badge={
          <Badge variant="primary" size="md">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            128-D Ontology Embeddings
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${rebuilding ? 'animate-spin' : ''}`} />}
              onClick={handleRebuildIndex}
              disabled={rebuilding}
            >
              {rebuilding ? 'Rebuilding Index...' : 'Rebuild Vector Store'}
            </Button>
          </div>
        }
      />

      {/* Safety Retrieval Disclaimer Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-950">Methodological Notice: </span>
          Semantic similarity measures cosine proximity within our 128-dimensional safety ontology subspace.
          Similarity scores reflect narrative and operational context concordance and do not represent risk level,
          probability, or SIF classification.
        </div>
      </div>

      {/* Search Input Box & Sample Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            <span>Search Safety Reports by Natural Language Narrative</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <textarea
                id="semantic-query-input"
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter incident or near-miss observation description to find semantically matching reports..."
                className="w-full p-3.5 text-sm bg-surface rounded-xl border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            {/* Predefined prompt pills */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Quick Grounding Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_QUERIES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(sample);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border text-left transition-colors truncate max-w-md ${
                      query === sample
                        ? 'bg-primary/10 border-primary text-primary font-semibold'
                        : 'bg-surface-muted/50 border-border text-foreground hover:bg-surface-muted'
                    }`}
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-subtle">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-surface-muted/60 px-3 py-1.5 rounded-lg border border-border">
                <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">Top Results:</span>
                <select
                  id="search-top-k"
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value={3}>3 matches</option>
                  <option value={5}>5 matches</option>
                  <option value={10}>10 matches</option>
                  <option value={20}>20 matches</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-surface-muted/60 px-3 py-1.5 rounded-lg border border-border">
                <span className="text-muted-foreground font-medium">Site Filter:</span>
                <select
                  id="search-site-filter"
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="">All Sites</option>
                  <option value="site-digboi">Digboi Central Asset</option>
                  <option value="site-moran-02">Moran Rig B</option>
                  <option value="site-naharkatiya-01">Naharkatiya Well</option>
                  <option value="site-duliajan-ref">Duliajan Gas Plant</option>
                </select>
              </div>
            </div>

            <Button
              id="execute-semantic-search-btn"
              variant="primary"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? 'Vector Searching...' : 'Run Semantic Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Search Results & Vector Store Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results column (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Semantic Search Matches ({results?.results.length || 0})
            </span>
            {results && (
              <span className="text-xs text-muted-foreground font-mono">
                Latency: {results.execution_time_ms} ms | Model: {results.model}
              </span>
            )}
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && (
            <div className="p-12 text-center bg-card rounded-xl border border-border">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Evaluating high-dimensional cosine similarity...</p>
              <p className="text-xs text-muted-foreground mt-1">Grounding query into safety ontology vector space</p>
            </div>
          )}

          {!isLoading && results && results.results.length === 0 && (
            <div className="p-12 text-center bg-card rounded-xl border border-border text-muted-foreground text-sm">
              No matching reports found with sufficient similarity.
            </div>
          )}

          {!isLoading && results && results.results.length > 0 && (
            <div className="space-y-3">
              {results.results.map((item, idx) => (
                <div
                  key={item.report_id}
                  id={`search-result-card-${item.report_number}`}
                  className="bg-card p-5 rounded-xl border border-border hover:border-primary/50 shadow-sm transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    {/* Header line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2.5 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-muted-foreground">#{idx + 1}</span>
                        <span className="font-mono text-sm font-bold text-foreground bg-surface-muted px-2.5 py-0.5 rounded">
                          {item.report_number}
                        </span>
                        <span className="text-xs text-muted-foreground bg-surface-muted/50 border border-border px-2 py-0.5 rounded">
                          {item.report_type}
                        </span>
                      </div>

                      {/* Similarity Chip */}
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getScoreColor(
                          item.similarity
                        )}`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Similarity: {item.similarity.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Operational Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-surface-muted/40 p-2 rounded-lg mb-2.5 border border-border-subtle">
                      <div>
                        <span className="text-muted-foreground">Site: </span>
                        <span className="font-semibold text-foreground">{item.site_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Activity: </span>
                        <span className="font-semibold text-foreground">{item.activity_name}</span>
                      </div>
                    </div>

                    {/* Excerpt */}
                    <p className="text-sm text-foreground italic bg-surface-muted/30 p-2.5 rounded-lg border border-border-subtle mb-3">
                      "{item.description_snippet}"
                    </p>

                    {/* Why Similar Explanation */}
                    {item.why_similar && item.why_similar.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Layers className="w-3 h-3 text-primary" /> Why similar:
                        </span>
                        <ul className="space-y-1 pl-1">
                          {item.why_similar.map((why, wIdx) => (
                            <li key={wIdx} className="text-xs text-foreground flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              <span>{why}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.report_datetime).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>

                    <Button
                      id={`view-report-from-search-${item.report_number}`}
                      variant="outline"
                      size="sm"
                      icon={<ChevronRight className="w-3.5 h-3.5" />}
                      onClick={() => onNavigate(`/reports/${item.report_id}`)}
                    >
                      View Report
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Diagnostics & Vector Store Health (1 col) */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <span>Vector Store Health</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-border-subtle">
                <span className="text-muted-foreground">Index Status:</span>
                <span className="font-bold text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {health?.status || 'AVAILABLE'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-border-subtle">
                <span className="text-muted-foreground">Backend Engine:</span>
                <span className="font-mono text-foreground">{health?.backend || 'FAISS_INMEMORY'}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-border-subtle">
                <span className="text-muted-foreground">Indexed Vectors:</span>
                <span className="font-bold text-foreground">{health?.total_vectors || 0} documents</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-border-subtle">
                <span className="text-muted-foreground">Vector Dimensions:</span>
                <span className="font-mono text-foreground">{health?.dimension || 128} float32</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-border-subtle">
                <span className="text-muted-foreground">Embedding Model:</span>
                <span className="font-mono text-foreground truncate max-w-[140px]" title={health?.embedding_model}>
                  {health?.embedding_model || 'suchak-embed-v1'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-border-subtle">
                <span className="text-muted-foreground">Persistence:</span>
                <span className="font-mono text-foreground text-[11px] truncate max-w-[140px]" title={health?.persistence_path}>
                  {health?.persistence_path || 'data/suchak_vector_index.json'}
                </span>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  icon={<ShieldCheck className="w-3.5 h-3.5" />}
                  onClick={handleRunConsistency}
                  disabled={checkingConsistency}
                >
                  {checkingConsistency ? 'Verifying...' : 'Check Vector Consistency'}
                </Button>
              </div>

              {consistency && (
                <div className="mt-3 p-3 rounded-lg bg-surface-muted/80 border border-border text-[11px] space-y-1 font-mono">
                  <div className="font-bold text-foreground">Consistency Check:</div>
                  <div className="text-muted-foreground">
                    Expected: {consistency.total_reports_expected} | Indexed: {consistency.total_vectors_indexed}
                  </div>
                  <div className={consistency.is_consistent ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                    Status: {consistency.is_consistent ? '100% Consistent' : 'Inconsistencies Detected'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Architecture Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Phase 7 Architecture</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>
                SUCHAK embeds safety reports through a deterministic, domain-grounded ontology projection model
                mapping narrative descriptions, barrier states, and IOGP life-saving rule indicators.
              </p>
              <p>
                Each vector is normalized to unit Euclidean length (<code className="text-foreground">L2 = 1.0</code>),
                enabling fast exact cosine similarity computation using inner products.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
