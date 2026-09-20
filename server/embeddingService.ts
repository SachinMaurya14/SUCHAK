import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import {
  EmbeddingConfig,
  DEFAULT_EMBEDDING_CONFIG,
  REPORT_EMBEDDING_DOCUMENT_VERSION,
  SemanticDocument,
  VectorDocument,
} from './vectorTypes.ts';

// Domain semantic concept projections for HSE oil & gas ontology
const DOMAIN_ONTOLOGY_VECTORS: Array<{
  category: string;
  keywords: string[];
  weight: number;
  subspace: [number, number]; // index range in 128-dim vector
}> = [
  {
    category: 'ENERGY_ISOLATION_AND_MACHINERY',
    keywords: [
      'energized',
      'machinery',
      'live',
      'loto',
      'isolation',
      'breaker',
      'stator',
      'switchgear',
      'electrical',
      'lockout',
      'tagout',
      'busbar',
      'equipment remained',
      'energised',
      'motor control',
      'power supply',
      'drive cabinet',
    ],
    weight: 2.2,
    subspace: [0, 16],
  },
  {
    category: 'MAINTENANCE_AND_OVERHAUL',
    keywords: [
      'maintenance',
      'overhaul',
      'technician',
      'repair',
      'servicing',
      'inspection',
      'disassembly',
      'mechanic',
      'troubleshooting',
      'crew',
      'replacement',
    ],
    weight: 1.8,
    subspace: [16, 30],
  },
  {
    category: 'WORKER_EXPOSURE_LINE_OF_FIRE',
    keywords: [
      'exposed',
      'exposure',
      'worker',
      'line of fire',
      'traversed',
      'barricade',
      'red zone',
      'personnel',
      'operator',
      'danger zone',
      'proximity',
      'stood below',
    ],
    weight: 2.0,
    subspace: [30, 44],
  },
  {
    category: 'PRESSURE_AND_FLUID_HAZARD',
    keywords: [
      'pressure',
      'hydrostatic',
      'pneumatic',
      '5,000 psi',
      'psi',
      'bleed-off',
      'whip check',
      'rupture',
      'manifold',
      'swivel joint',
      'burst',
      'hose',
      'piping',
    ],
    weight: 2.0,
    subspace: [44, 58],
  },
  {
    category: 'LIFTING_AND_SUSPENDED_LOAD',
    keywords: [
      'lift',
      'lifting',
      'crane',
      'rigging',
      'sling',
      'webbing',
      'basket',
      'suspended load',
      'tandem lift',
      'banksman',
      'hoist',
      'dunnage',
    ],
    weight: 2.0,
    subspace: [58, 72],
  },
  {
    category: 'WORKING_AT_HEIGHT_AND_FALL',
    keywords: [
      'scaffold',
      'scaffolders',
      'height',
      'elevation',
      'lanyard',
      'harness',
      'lifeline',
      'catwalk',
      'tank roof',
      'unclipped',
      'fall',
      '8.5 meters',
    ],
    weight: 2.0,
    subspace: [72, 86],
  },
  {
    category: 'CONFINED_SPACE_AND_ATMOSPHERE',
    keywords: [
      'confined space',
      'gas',
      'h2s',
      'oxygen',
      'skirt',
      'separator',
      'exhaust valve',
      'toxic',
      'air monitoring',
      'detector',
      'evacuated',
    ],
    weight: 2.0,
    subspace: [86, 100],
  },
  {
    category: 'HOT_WORK_AND_IGNITION',
    keywords: [
      'grinder',
      'cutting',
      'welding',
      'spark',
      'flame',
      'hot work',
      'burn',
      'flange',
      'deburring',
    ],
    weight: 1.8,
    subspace: [100, 114],
  },
  {
    category: 'BARRIER_DEFENSE_AND_CONTROLS',
    keywords: [
      'barrier',
      'disconnected',
      'jammed',
      'bypassed',
      'clipped',
      'padlock',
      'unpadded',
      'failure',
      'guard',
      'safety restraint',
    ],
    weight: 1.9,
    subspace: [114, 128],
  },
];

export class EmbeddingService {
  private config: EmbeddingConfig;

  constructor(config?: Partial<EmbeddingConfig>) {
    this.config = { ...DEFAULT_EMBEDDING_CONFIG, ...config };
  }

  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  /**
   * Prepares a structured, controlled semantic document text from a safety report and its validated analysis.
   * Preserves original report description completely unaltered.
   */
  prepareSemanticDocument(
    report: {
      id: string;
      organization_id: string;
      report_number: string;
      report_type: string;
      description: string;
      actual_outcome?: string | null;
      site?: { id: string; name: string } | null;
      activity?: { id: string; name: string; category?: string } | null;
      location?: { id: string; name: string } | null;
    },
    analysis?: any | null
  ): SemanticDocument {
    const siteName = report.site?.name || 'Unknown Site';
    const siteId = report.site?.id || 'unknown';
    const activityName = report.activity?.name || 'General Operations';
    const activityCategory = report.activity?.category || 'OPERATIONS';
    const locationName = report.location?.name || '';

    // Extract Phase 5 intelligence parameters if available
    const hazards: string[] = analysis?.hazards || [];
    const sifPotential: boolean =
      analysis?.classification === 'SIF_POTENTIAL' || analysis?.sif_potential === true;
    const exposureDetected: boolean =
      !!analysis?.worker_exposure ||
      (analysis?.explanation && analysis.explanation.toLowerCase().includes('exposure'));
    const barrierFailureDetected: boolean =
      !!analysis?.barrier_failure ||
      (analysis?.explanation && analysis.explanation.toLowerCase().includes('barrier'));

    // Controlled semantic document text composition
    const lines: string[] = [
      `[DOCUMENT_TYPE]: HSE_SAFETY_REPORT`,
      `[REPORT_NUMBER]: ${report.report_number}`,
      `[REPORT_TYPE]: ${report.report_type}`,
      `[SITE]: ${siteName}`,
      `[LOCATION]: ${locationName}`,
      `[ACTIVITY]: ${activityName} (Category: ${activityCategory})`,
      `[DESCRIPTION]: ${report.description.trim()}`,
    ];

    if (report.actual_outcome && report.actual_outcome.trim().length > 0) {
      lines.push(`[ACTUAL_OUTCOME]: ${report.actual_outcome.trim()}`);
    }

    if (hazards.length > 0) {
      lines.push(`[EXTRACTED_HAZARDS]: ${hazards.join(', ')}`);
    }

    if (analysis?.sif_precursor) {
      lines.push(`[SIF_PRECURSOR]: ${analysis.sif_precursor}`);
    }

    if (analysis?.worker_exposure) {
      lines.push(`[WORKER_EXPOSURE]: ${analysis.worker_exposure}`);
    }

    if (analysis?.barrier_failure) {
      lines.push(`[BARRIER_FAILURE]: ${analysis.barrier_failure}`);
    }

    const semanticText = lines.join('\n');

    // Deterministic content hash (SHA-256) over semantic text, document version, and embedding model
    const hash = crypto
      .createHash('sha256')
      .update(`${REPORT_EMBEDDING_DOCUMENT_VERSION}::${this.config.model}::${semanticText}`)
      .digest('hex');

    return {
      report_id: report.id,
      organization_id: report.organization_id || 'oil-india-demo',
      document_version: REPORT_EMBEDDING_DOCUMENT_VERSION,
      semantic_text: semanticText,
      content_hash: hash,
      source_analysis_version: analysis?.id || null,
      metadata: {
        report_number: report.report_number,
        report_type: report.report_type,
        site_id: siteId,
        site_name: siteName,
        activity_id: report.activity?.id || null,
        activity_name: activityName,
        activity_category: activityCategory,
        location_name: locationName,
        hazards,
        sif_potential: sifPotential,
        exposure_detected: exposureDetected,
        barrier_failure_detected: barrierFailureDetected,
      },
    };
  }

  /**
   * Generates a normalized vector embedding.
   * If Gemini API is configured and provider is 'gemini', it attempts Gemini embeddings.
   * Otherwise, it generates an industrial-grade, deterministic domain-grounded vector.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (this.config.provider === 'gemini' && process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const res = await (ai.models as any).embedContent({
          model: this.config.model || 'text-embedding-004',
          contents: text,
        });
        if (res && res.embedding && Array.isArray(res.embedding.values)) {
          return this.normalize(res.embedding.values);
        }
      } catch (err) {
        console.warn('[SUCHAK Embedding] Gemini embedding call failed, falling back to safety vectorizer:', err);
      }
    }

    // High-precision safety ontology embedding generator
    return this.generateDeterministicDomainVector(text, this.config.dimension);
  }

  /**
   * Deterministic domain semantic vectorizer.
   * Maps safety narrative terms to ontology subspaces and high-dimensional hash projections.
   */
  private generateDeterministicDomainVector(text: string, dimension: number): number[] {
    const vec = new Array(dimension).fill(0);
    const lower = text.toLowerCase();

    // 1. Ontology subspace projection
    for (const ont of DOMAIN_ONTOLOGY_VECTORS) {
      let matchCount = 0;
      for (const kw of ont.keywords) {
        if (lower.includes(kw)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const [start, end] = ont.subspace;
        const activation = Math.min(2.5, Math.log1p(matchCount) * ont.weight);

        for (let i = start; i < end && i < dimension; i++) {
          // pseudo-random deterministic spread within the category subspace
          const subHash = this.fastHash(`${ont.category}:${i}:${text.length}`) % 1000 / 1000;
          vec[i] += activation * (0.6 + 0.4 * subHash);
        }
      }
    }

    // 2. Token n-gram latent hashing spread across entire vector
    const words = lower.replace(/[^a-z0-9_\-\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const h1 = this.fastHash(word) % dimension;
      vec[h1] += 0.25;

      if (i < words.length - 1) {
        const bigram = `${word}_${words[i + 1]}`;
        const h2 = this.fastHash(bigram) % dimension;
        vec[h2] += 0.4;
      }
    }

    // Normalize to unit length
    return this.normalize(vec);
  }

  private fastHash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  private normalize(vec: number[]): number[] {
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) {
      sumSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(sumSq);
    if (norm === 0) return vec;
    return vec.map((v) => v / norm);
  }

  /**
   * Checks if an indexed vector document has become stale due to changes in
   * semantic text, analysis version, document version, or model version.
   */
  isStale(
    vectorDoc: VectorDocument,
    currentReport: any,
    currentAnalysis: any
  ): { stale: boolean; reason?: string } {
    const currentDoc = this.prepareSemanticDocument(currentReport, currentAnalysis);

    if (vectorDoc.document_version !== REPORT_EMBEDDING_DOCUMENT_VERSION) {
      return {
        stale: true,
        reason: `Document format upgraded from ${vectorDoc.document_version} to ${REPORT_EMBEDDING_DOCUMENT_VERSION}`,
      };
    }

    if (vectorDoc.model_name !== this.config.model) {
      return {
        stale: true,
        reason: `Embedding model changed from ${vectorDoc.model_name} to ${this.config.model}`,
      };
    }

    if (vectorDoc.content_hash !== currentDoc.content_hash) {
      return {
        stale: true,
        reason: 'Report description, outcome, activity, or analysis parameters have changed',
      };
    }

    return { stale: false };
  }
}

export const embeddingService = new EmbeddingService();
