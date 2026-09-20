import { GoogleGenAI } from '@google/genai';

export interface SafetyAnalysisResult {
  id: string;
  report_id: string;
  model_version_id?: string | null;
  status: string;
  classification: 'SIF_POTENTIAL' | 'NON_SIF_POTENTIAL' | 'NEEDS_REVIEW';
  sif_potential: boolean | null;
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

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    try {
      geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.warn('[SUCHAK] Could not initialize Gemini client:', err);
      geminiClient = null;
    }
  }
  return geminiClient;
}

/**
 * Deterministic Safety Fallback Engine
 * Grounded in IOGP Life-Saving Rules and high-energy hazard precursors.
 */
export function evaluateSafetyNarrativeDeterministic(
  reportId: string,
  description: string,
  actualOutcome?: string | null
): SafetyAnalysisResult {
  const descLower = description.toLowerCase();
  const evidence: string[] = [];
  const indicators: string[] = [];
  const hazards: string[] = [];

  let isSif = false;
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  let classification: 'SIF_POTENTIAL' | 'NON_SIF_POTENTIAL' | 'NEEDS_REVIEW' = 'NEEDS_REVIEW';
  let explanation =
    'The observation narrative requires manual HSE safety review to verify potential energy and barrier status.';
  let potentialConsequence = 'Unverified risk requiring safety officer assessment.';

  // Rule 1: High Pressure & Stored Fluid Energy
  if (
    ['pressure', '5,000 psi', '5000 psi', 'psi', 'manifold', 'hydrostatic', 'swivel joint', 'whip check', 'blowout'].some(
      (w) => descLower.includes(w)
    )
  ) {
    hazards.push('PRESSURE');
    if (
      ['whip check', 'barricade', 'swivel', 'rupture', 'leak', 'line of fire', 'bleed-off', 'blewoff'].some((w) =>
        descLower.includes(w)
      )
    ) {
      isSif = true;
      priority = 'CRITICAL';
      classification = 'SIF_POTENTIAL';
      indicators.push('High-pressure line testing with compromised or bypassed safety restraint');
      evidence.push('Hydrostatic or pneumatic pressure testing detected in narrative');
      if (descLower.includes('whip check')) {
        evidence.push('Safety whip check restraint cable identified as compromised or disconnected');
      }
      potentialConsequence =
        'Component rupture causing catastrophic line whip, severe projectile impact, or fatal trauma.';
      explanation =
        'WHY FLAGGED: Report documents high-pressure line operation with compromised barrier controls, representing a direct Line-of-Fire SIF precursor.';
    }
  }
  // Rule 2: Working at Height & Gravitational Energy
  else if (
    ['working at height', 'fall from', 'scaffold', 'monkey board', 'derrick', 'mast', 'ladder', 'floor opening', 'grating removed'].some(
      (w) => descLower.includes(w)
    )
  ) {
    hazards.push('GRAVITY');
    if (['harness', 'lanyard', 'unlatched', 'opening', 'missing guardrail', 'no fall arrest'].some((w) => descLower.includes(w))) {
      isSif = true;
      priority = 'HIGH';
      classification = 'SIF_POTENTIAL';
      indicators.push('Elevated work without verified primary fall protection barrier');
      evidence.push('Personnel working at elevation without secure fall arrest tethering');
      potentialConsequence = 'Fall from height resulting in fatal or permanent life-altering blunt force trauma.';
      explanation =
        'WHY FLAGGED: Working at height with defeated or missing fall arrest barrier represents an immediate SIF potential signal.';
    }
  }
  // Rule 3: Confined Space Entry & Toxic Gas
  else if (
    ['confined space', 'h2s', 'toxic gas', 'gas test', 'oxygen deficiency', 'mud tank entry', 'vessel entry'].some((w) =>
      descLower.includes(w)
    )
  ) {
    hazards.push('CONFINED_SPACE', 'CHEMICAL');
    isSif = true;
    priority = 'CRITICAL';
    classification = 'SIF_POTENTIAL';
    indicators.push('Confined space or atmospheric hazard exposure');
    evidence.push('Personnel entry into confined vessel or atmospheric enclosure detected in text');
    potentialConsequence = 'Acute toxic inhalation or oxygen depletion resulting in asphyxiation or fatality.';
    explanation =
      'WHY FLAGGED: Confined space activities carry catastrophic atmospheric risk when isolation or gas testing is questioned.';
  }
  // Rule 4: Hazardous Energy & Electrical Isolation (LOTO)
  else if (
    ['loto', 'lockout', 'energized', 'switchgear', 'breaker', 'live wire', 'isolation failure'].some((w) =>
      descLower.includes(w)
    )
  ) {
    hazards.push('ELECTRICAL', 'MECHANICAL');
    isSif = true;
    priority = 'HIGH';
    classification = 'SIF_POTENTIAL';
    indicators.push('Failure or bypass of energy isolation (LOTO)');
    evidence.push('Work performed adjacent to energized equipment without verified positive isolation');
    potentialConsequence = 'Arc flash, electrocution, or sudden machine start-up causing crush or amputation injury.';
    explanation =
      'WHY FLAGGED: Incomplete energy isolation during maintenance exposes workers directly to uncontrolled electrical or mechanical release.';
  }
  // Rule 5: Suspended Loads & Heavy Rigging
  else if (
    ['suspended load', 'crane', 'rigging', 'sling', 'dropped object', 'casing pipe', 'drill pipe falling', 'catwalk'].some(
      (w) => descLower.includes(w)
    )
  ) {
    hazards.push('GRAVITY', 'MECHANICAL');
    isSif = true;
    priority = 'HIGH';
    classification = 'SIF_POTENTIAL';
    indicators.push('Suspended load handling with personnel in drop zone');
    evidence.push('Heavy load suspended during lifting operation with personnel exposure');
    potentialConsequence = 'Dropped load impact causing fatal crush or severe musculoskeletal trauma.';
    explanation =
      'WHY FLAGGED: Suspended load in vicinity of personnel represents a classic fatal precursor event.';
  }
  // Rule 6: Minor Routine Observation / Housekeeping (NON_SIF)
  else if (
    ['slip', 'trip', 'housekeeping', 'spill clean', 'trash', 'minor scratch', 'paper cut', 'clean water', 'ergonomic chair'].some(
      (w) => descLower.includes(w)
    ) &&
    !['high', 'fall', 'rupture', 'pressure', 'kill', 'amputat', 'death'].some((w) => descLower.includes(w))
  ) {
    classification = 'NON_SIF_POTENTIAL';
    priority = 'LOW';
    hazards.push('LOW_ENERGY');
    indicators.push('Low-energy operational deviation or routine housekeeping issue');
    evidence.push('Report describes minor low-energy observation without credible high-magnitude release pathway');
    potentialConsequence = 'Minor surface contusion, sprain, or non-disabling first aid treatment.';
    explanation =
      'WHY FLAGGED: Evaluated as non-SIF potential due to the absence of uncontrolled high-magnitude energy or life-altering mechanisms.';
  } else {
    classification = 'NEEDS_REVIEW';
    priority = 'MEDIUM';
    indicators.push('Ambiguous hazard context requiring HSE inspector assessment');
    evidence.push('Report narrative does not provide conclusive energy magnitude or barrier state');
    potentialConsequence = 'Potential consequence cannot be determined without additional operational investigation.';
    explanation =
      'WHY FLAGGED: Report narrative contains ambiguous details; routed to HSE review queue to prevent false clearance.';
  }

  const nowIso = new Date().toISOString();

  return {
    id: `ans-${Math.random().toString(36).substring(2, 10)}`,
    report_id: reportId,
    status: 'ANALYZED',
    classification,
    sif_potential: isSif,
    confidence_estimate: isSif || classification === 'NON_SIF_POTENTIAL' ? 0.88 : 0.52,
    confidence_band: isSif ? 'HIGH' : classification === 'NEEDS_REVIEW' ? 'LOW' : 'MEDIUM',
    priority,
    safety_indicators: indicators,
    hazards,
    precursor_summary: indicators[0] || 'Ambiguous observation condition',
    evidence,
    actual_outcome: actualOutcome || 'Reported as field observation without serious actual injury',
    potential_consequence: potentialConsequence,
    explanation,
    model_name: 'suchak_deterministic_nlp_engine',
    model_version: 'v1.0.0-rules',
    prompt_version: 'DETERMINISTIC_RULES_V1',
    analyzed_at: nowIso,
    created_at: nowIso,
  };
}

/**
 * Executes AI safety analysis with server-side Gemini if configured,
 * or seamless deterministic fallback.
 */
export async function analyzeReportSafety(
  reportId: string,
  description: string,
  actualOutcome?: string | null
): Promise<SafetyAnalysisResult> {
  const fallback = evaluateSafetyNarrativeDeterministic(reportId, description, actualOutcome);

  const client = getGeminiClient();
  if (!client) {
    return fallback;
  }

  try {
    const prompt = `You are SUCHAK, an Enterprise HSE Safety Intelligence AI system for oil & gas drilling and refinery operations.
Analyze the following safety observation narrative and classify if it represents a Serious Injury or Fatality (SIF) Precursor.

Report Narrative:
"${description}"
Actual Outcome:
"${actualOutcome || 'None specified'}"

Return ONLY a valid JSON object matching this exact schema:
{
  "classification": "SIF_POTENTIAL" | "NON_SIF_POTENTIAL" | "NEEDS_REVIEW",
  "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "confidence_estimate": number between 0.1 and 0.99,
  "confidence_band": "HIGH" | "MEDIUM" | "LOW",
  "hazards": string[],
  "safety_indicators": string[],
  "precursor_summary": string,
  "evidence": string[],
  "potential_consequence": string,
  "explanation": string
}`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      const nowIso = new Date().toISOString();
      return {
        id: `ans-${Math.random().toString(36).substring(2, 10)}`,
        report_id: reportId,
        status: 'ANALYZED',
        classification: parsed.classification || fallback.classification,
        sif_potential: parsed.classification === 'SIF_POTENTIAL',
        confidence_estimate: Number(parsed.confidence_estimate) || fallback.confidence_estimate,
        confidence_band: parsed.confidence_band || fallback.confidence_band,
        priority: parsed.priority || fallback.priority,
        safety_indicators: Array.isArray(parsed.safety_indicators) ? parsed.safety_indicators : fallback.safety_indicators,
        hazards: Array.isArray(parsed.hazards) ? parsed.hazards : fallback.hazards,
        precursor_summary: parsed.precursor_summary || fallback.precursor_summary,
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence : fallback.evidence,
        actual_outcome: actualOutcome || fallback.actual_outcome,
        potential_consequence: parsed.potential_consequence || fallback.potential_consequence,
        explanation: parsed.explanation || fallback.explanation,
        model_name: 'gemini-2.5-flash',
        model_version: 'v2.5',
        prompt_version: 'SUCHAK_SIF_V1',
        analyzed_at: nowIso,
        created_at: nowIso,
      };
    }
  } catch (err) {
    console.warn('[SUCHAK] Gemini analysis failed or timed out, using deterministic fallback:', err);
  }

  return fallback;
}
