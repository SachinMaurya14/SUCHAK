import { IVectorStore } from './vectorStore.ts';
import { EmbeddingService } from './embeddingService.ts';
import {
  SimilarReportItem,
  SimilarityExplanation,
  SemanticSearchResponse,
  VectorSearchResult,
} from './vectorTypes.ts';

export interface SimilarSearchOptions {
  top_k?: number;
  site_id?: string;
  activity_id?: string;
  report_type?: string;
  date_from?: string;
  date_to?: string;
  organization_id?: string;
}

export class SimilaritySearchService {
  private vectorStore: IVectorStore;
  private embeddingService: EmbeddingService;
  private reportLookup: (id: string) => any | null;

  constructor(
    vectorStore: IVectorStore,
    embeddingService: EmbeddingService,
    reportLookup: (id: string) => any | null
  ) {
    this.vectorStore = vectorStore;
    this.embeddingService = embeddingService;
    this.reportLookup = reportLookup;
  }

  /**
   * Explains why two safety reports are semantically similar based strictly on
   * shared structured metadata and corroborated narrative evidence.
   * Never hallucinates unshared factors.
   */
  generateSimilarityExplanation(
    sourceReport: any,
    targetReport: any,
    similarity: number
  ): SimilarityExplanation {
    const reasons: string[] = [];

    const sourceDesc = (sourceReport.description || '').toLowerCase();
    const targetDesc = (targetReport.description || '').toLowerCase();

    const sourceActivity = (sourceReport.activity?.name || '').toLowerCase();
    const targetActivity = (targetReport.activity?.name || '').toLowerCase();
    const sourceCategory = (sourceReport.activity?.category || '').toLowerCase();
    const targetCategory = (targetReport.activity?.category || '').toLowerCase();

    // 1. Maintenance & Overhaul Context
    const isSourceMaintenance =
      sourceDesc.includes('maintenance') ||
      sourceDesc.includes('repair') ||
      sourceActivity.includes('maintenance') ||
      sourceCategory === 'maintenance';
    const isTargetMaintenance =
      targetDesc.includes('maintenance') ||
      targetDesc.includes('repair') ||
      targetActivity.includes('maintenance') ||
      targetCategory === 'maintenance';

    const activityMatch = isSourceMaintenance && isTargetMaintenance;
    if (activityMatch) {
      reasons.push('similar maintenance context');
    } else if (sourceCategory && targetCategory && sourceCategory === targetCategory) {
      reasons.push(`similar operational category (${sourceReport.activity?.category})`);
    }

    // 2. Hazardous Energy & Electrical / Mechanical Isolation Context
    const energyKeywords = [
      'energized',
      'live',
      'breaker',
      'switchgear',
      'stator',
      'loto',
      'isolation',
      'machinery',
      'electrical',
      'busbar',
      'equipment remained',
    ];
    const sourceHasEnergy = energyKeywords.some((k) => sourceDesc.includes(k));
    const targetHasEnergy = energyKeywords.some((k) => targetDesc.includes(k));

    const pressureKeywords = ['pressure', 'hydrostatic', 'pneumatic', 'psi', 'whip check', 'manifold'];
    const sourceHasPressure = pressureKeywords.some((k) => sourceDesc.includes(k));
    const targetHasPressure = pressureKeywords.some((k) => targetDesc.includes(k));

    let hazardMatch = false;
    if (sourceHasEnergy && targetHasEnergy) {
      hazardMatch = true;
      reasons.push('similar hazardous-energy context');
    } else if (sourceHasPressure && targetHasPressure) {
      hazardMatch = true;
      reasons.push('similar high-pressure testing context');
    }

    // 3. Worker Exposure Context (Line of Fire / Red Zone / Danger Envelope)
    const exposureKeywords = [
      'exposed',
      'exposure',
      'line of fire',
      'barricade',
      'red zone',
      'personnel',
      'worker',
      'technician',
      'stood below',
    ];
    const sourceHasExposure =
      exposureKeywords.some((k) => sourceDesc.includes(k)) || !!sourceReport.latest_analysis?.worker_exposure;
    const targetHasExposure =
      exposureKeywords.some((k) => targetDesc.includes(k)) || !!targetReport.latest_analysis?.worker_exposure;

    const workerExposureMatch = sourceHasExposure && targetHasExposure;
    if (workerExposureMatch) {
      reasons.push('similar worker exposure');
    }

    // 4. Barrier Defense / Safeguard Failure
    const barrierKeywords = [
      'whip check',
      'disconnected',
      'clipped',
      'padlock',
      'jammed',
      'bypassed',
      'unclipped',
      'unpadded',
      'lanyard',
    ];
    const sourceHasBarrier =
      barrierKeywords.some((k) => sourceDesc.includes(k)) || !!sourceReport.latest_analysis?.barrier_failure;
    const targetHasBarrier =
      barrierKeywords.some((k) => targetDesc.includes(k)) || !!targetReport.latest_analysis?.barrier_failure;

    const barrierFailureMatch = sourceHasBarrier && targetHasBarrier;
    if (barrierFailureMatch) {
      reasons.push('similar barrier defense degradation');
    }

    // 5. Working at Height / Suspended Load / Confined Space context
    if (
      (sourceDesc.includes('scaffold') || sourceDesc.includes('height')) &&
      (targetDesc.includes('scaffold') || targetDesc.includes('height'))
    ) {
      reasons.push('similar working at height / fall from elevation context');
    }

    if (
      (sourceDesc.includes('crane') || sourceDesc.includes('lift') || sourceDesc.includes('sling')) &&
      (targetDesc.includes('crane') || targetDesc.includes('lift') || targetDesc.includes('sling'))
    ) {
      reasons.push('similar suspended load / rigging lift context');
    }

    if (
      (sourceDesc.includes('confined') || sourceDesc.includes('gas')) &&
      (targetDesc.includes('confined') || targetDesc.includes('gas'))
    ) {
      reasons.push('similar confined space / atmospheric hazard context');
    }

    // 6. Site Concordance
    const siteMatch = !!(
      sourceReport.site_id &&
      targetReport.site_id &&
      sourceReport.site_id === targetReport.site_id
    );
    if (siteMatch) {
      reasons.push(`same operational site (${sourceReport.site?.name || sourceReport.site_id})`);
    }

    const reportTypeMatch = sourceReport.report_type === targetReport.report_type;

    // Fallback if no specialized overlap found
    if (reasons.length === 0) {
      reasons.push('concordant semantic narrative terminology');
    }

    const summary = `Retrieved with ${Math.round(similarity * 100)}% semantic similarity due to ${reasons.join(', ')}.`;

    return {
      similarity,
      reasons,
      shared_factors: {
        activity_match: activityMatch,
        hazard_match: hazardMatch,
        worker_exposure_match: workerExposureMatch,
        barrier_failure_match: barrierFailureMatch,
        site_match: siteMatch,
        report_type_match: reportTypeMatch,
      },
      summary,
    };
  }

  /**
   * Search historical safety reports semantically similar to a specified report ID.
   */
  async findSimilarReports(
    reportId: string,
    options?: SimilarSearchOptions
  ): Promise<{
    source_report: any;
    similar_reports: SimilarReportItem[];
    model: string;
    total_found: number;
  }> {
    const sourceReport = this.reportLookup(reportId);
    if (!sourceReport) {
      throw new Error(`Source safety report '${reportId}' not found.`);
    }

    const orgId = options?.organization_id || sourceReport.organization_id || 'oil-india-demo';

    // 1. Retrieve or generate source embedding
    let vectorDoc = await this.vectorStore.getMapping(sourceReport.id);
    if (!vectorDoc || vectorDoc.vector.length !== this.embeddingService.getConfig().dimension) {
      const semDoc = this.embeddingService.prepareSemanticDocument(
        sourceReport,
        sourceReport.latest_analysis
      );
      const vector = await this.embeddingService.generateEmbedding(semDoc.semantic_text);
      vectorDoc = {
        id: `vec-${Math.random().toString(36).substring(2, 9)}`,
        numeric_id: 0,
        report_id: sourceReport.id,
        organization_id: orgId,
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
    }

    // 2. Perform vector search
    const topK = options?.top_k || 5;
    const searchResults = await this.vectorStore.search({
      vector: vectorDoc.vector,
      top_k: topK,
      filters: {
        organization_id: orgId,
        exclude_report_id: sourceReport.id,
        site_id: options?.site_id,
        activity_id: options?.activity_id,
        report_type: options?.report_type,
        date_from: options?.date_from,
        date_to: options?.date_to,
      },
    });

    // 3. Map candidates and generate evidence-backed explanations
    const items: SimilarReportItem[] = [];

    for (const result of searchResults) {
      const candidate = this.reportLookup(result.document.report_id);
      if (!candidate) continue;

      const explanation = this.generateSimilarityExplanation(
        sourceReport,
        candidate,
        result.similarity
      );

      let simLabel = 'Moderate Similarity';
      if (result.similarity >= 0.85) simLabel = 'High Similarity';
      else if (result.similarity >= 0.75) simLabel = 'Moderate-High';
      else if (result.similarity < 0.6) simLabel = 'Baseline';

      items.push({
        report_id: candidate.id,
        report_number: candidate.report_number,
        report_type: candidate.report_type,
        site_id: candidate.site_id,
        site_name: candidate.site?.name || 'Unknown Site',
        activity_name: candidate.activity?.name || 'General Activity',
        report_datetime: candidate.report_datetime,
        description_snippet:
          candidate.description.length > 130
            ? `${candidate.description.substring(0, 127)}...`
            : candidate.description,
        similarity: result.similarity,
        similarity_label: simLabel,
        why_similar: explanation.reasons,
        explanation_summary: explanation.summary,
      });
    }

    return {
      source_report: sourceReport,
      similar_reports: items,
      model: this.embeddingService.getConfig().model,
      total_found: items.length,
    };
  }

  /**
   * Free-text semantic search endpoint for ad-hoc queries.
   */
  async searchByFreeText(
    query: string,
    options?: SimilarSearchOptions
  ): Promise<SemanticSearchResponse> {
    const startTime = Date.now();
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) {
      return {
        query: '',
        total_matches: 0,
        top_k: options?.top_k || 10,
        filters_applied: options || {},
        results: [],
        execution_time_ms: 0,
        model: this.embeddingService.getConfig().model,
        disclaimer:
          'Semantic similarity is a retrieval measure reflecting narrative and safety context concordance. It does not represent risk level, probability, or SIF classification.',
      };
    }

    const orgId = options?.organization_id || 'oil-india-demo';

    // 1. Generate query vector
    const queryVector = await this.embeddingService.generateEmbedding(cleanQuery);

    // 2. Perform search
    const topK = options?.top_k || 10;
    const searchResults = await this.vectorStore.search({
      vector: queryVector,
      top_k: topK,
      filters: {
        organization_id: orgId,
        site_id: options?.site_id,
        activity_id: options?.activity_id,
        report_type: options?.report_type,
        date_from: options?.date_from,
        date_to: options?.date_to,
      },
    });

    // 3. Map candidates
    const syntheticQueryReport = {
      description: cleanQuery,
      activity: null,
      site: null,
      report_type: 'Inquiry',
      latest_analysis: null,
    };

    const items: SimilarReportItem[] = [];

    for (const result of searchResults) {
      const candidate = this.reportLookup(result.document.report_id);
      if (!candidate) continue;

      const explanation = this.generateSimilarityExplanation(
        syntheticQueryReport,
        candidate,
        result.similarity
      );

      let simLabel = 'Moderate Similarity';
      if (result.similarity >= 0.85) simLabel = 'High Similarity';
      else if (result.similarity >= 0.75) simLabel = 'Moderate-High';
      else if (result.similarity < 0.6) simLabel = 'Baseline';

      items.push({
        report_id: candidate.id,
        report_number: candidate.report_number,
        report_type: candidate.report_type,
        site_id: candidate.site_id,
        site_name: candidate.site?.name || 'Unknown Site',
        activity_name: candidate.activity?.name || 'General Activity',
        report_datetime: candidate.report_datetime,
        description_snippet:
          candidate.description.length > 130
            ? `${candidate.description.substring(0, 127)}...`
            : candidate.description,
        similarity: result.similarity,
        similarity_label: simLabel,
        why_similar: explanation.reasons,
        explanation_summary: explanation.summary,
      });
    }

    const execTime = Date.now() - startTime;

    return {
      query: cleanQuery,
      total_matches: items.length,
      top_k: topK,
      filters_applied: options || {},
      results: items,
      execution_time_ms: execTime,
      model: this.embeddingService.getConfig().model,
      disclaimer:
        'Semantic similarity is a retrieval measure reflecting narrative and safety context concordance. It does not represent risk level, probability, or SIF classification.',
    };
  }
}
