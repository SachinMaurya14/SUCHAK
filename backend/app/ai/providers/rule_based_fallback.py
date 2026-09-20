"""
SUCHAK Rule-Based Deterministic Safety Fallback Provider
Phase 4 Safety NLP Engine
Minimal, deterministic safety fallback based on explicitly documented industrial HSE rules.
Ensures safety-first triage when external AI services are unavailable or in offline environments.
DOES NOT invent fake classifications or falsely clear high-risk situations.
"""
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from backend.app.ai.providers.base import AIProvider
from backend.app.ai.schemas.safety_analysis import (
    SafetyAnalysisResult,
    SIFClassification,
    ConfidenceBand,
)
from backend.app.models.analysis import SIFPriority


class RuleBasedFallbackProvider(AIProvider):
    """
    Deterministic rule-based safety evaluation engine.
    Applied when external LLM providers are unconfigured or offline.
    Maps documented high-energy precursor signals to SIF classifications
    and safely defaults to NEEDS_REVIEW when evidence is ambiguous.
    """

    @property
    def provider_name(self) -> str:
        return "rule_based_fallback"

    @property
    def model_name(self) -> str:
        return "suchak_rule_engine_fallback"

    @property
    def model_version(self) -> str:
        return "v1.0.0-deterministic"

    @property
    def prompt_version(self) -> str:
        return "DETERMINISTIC_RULES_V1"

    def analyze_report(
        self,
        description: str,
        actual_outcome: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> SafetyAnalysisResult:
        desc_lower = description.lower()
        evidence: List[str] = []
        indicators: List[str] = []
        hazards: List[str] = []

        is_sif = False
        priority = SIFPriority.MEDIUM
        classification = SIFClassification.NEEDS_REVIEW
        explanation = "The observation narrative requires manual HSE safety review to verify potential energy and barrier status."
        potential_consequence = "Unverified risk requiring safety officer assessment."

        # Documented Rule 1: High Pressure & Stored Fluid Energy
        if any(w in desc_lower for w in ["pressure", "5,000 psi", "5000 psi", "psi", "manifold", "hydrostatic", "swivel joint", "whip check", "blowout"]):
            hazards.append("PRESSURE")
            if any(w in desc_lower for w in ["whip check", "barricade", "swivel", "rupture", "leak", "line of fire", "blewoff"]):
                is_sif = True
                priority = SIFPriority.CRITICAL
                classification = SIFClassification.SIF_POTENTIAL
                indicators.append("High-pressure line testing with compromised or bypassed safety restraint")
                evidence.append("Hydrostatic or pneumatic pressure testing detected in text")
                if "whip check" in desc_lower:
                    evidence.append("Safety whip check restraint cable identified as compromised or disconnected")
                potential_consequence = "Component rupture causing catastrophic line whip, severe projectile impact, or fatal trauma."
                explanation = "WHY FLAGGED: Report documents high-pressure line operation with compromised barrier controls, representing a direct Line-of-Fire SIF precursor."

        # Documented Rule 2: Working at Height & Gravitational Energy
        elif any(w in desc_lower for w in ["working at height", "fall from", "scaffold", "monkey board", "derrick", "mast", "ladder", "floor opening", "grating removed"]):
            hazards.append("GRAVITY")
            if any(w in desc_lower for w in ["harness", "lanyard", "unlatched", "opening", "missing guardrail", "no fall arrest"]):
                is_sif = True
                priority = SIFPriority.HIGH
                classification = SIFClassification.SIF_POTENTIAL
                indicators.append("Elevated work without verified primary fall protection barrier")
                evidence.append("Personnel working at elevation without secure fall arrest tethering")
                potential_consequence = "Fall from height resulting in fatal or permanent life-altering blunt force trauma."
                explanation = "WHY FLAGGED: Working at height with defeated or missing fall arrest barrier represents an immediate SIF potential signal."

        # Documented Rule 3: Confined Space Entry & Toxic Gas
        elif any(w in desc_lower for w in ["confined space", "h2s", "toxic gas", "gas test", "oxygen deficiency", "mud tank entry", "vessel entry"]):
            hazards.append("CONFINED_SPACE")
            hazards.append("CHEMICAL")
            is_sif = True
            priority = SIFPriority.CRITICAL
            classification = SIFClassification.SIF_POTENTIAL
            indicators.append("Confined space or atmospheric hazard exposure")
            evidence.append("Personnel entry into confined vessel or atmospheric enclosure detected in text")
            potential_consequence = "Acute toxic inhalation or oxygen depletion resulting in asphyxiation or fatality."
            explanation = "WHY FLAGGED: Confined space activities carry catastrophic atmospheric risk when isolation or gas testing is questioned."

        # Documented Rule 4: Hazardous Energy & Electrical Isolation (LOTO)
        elif any(w in desc_lower for w in ["loto", "lockout", "energized", "switchgear", "breaker", "live wire", "isolation failure"]):
            hazards.append("ELECTRICAL")
            hazards.append("MECHANICAL")
            is_sif = True
            priority = SIFPriority.HIGH
            classification = SIFClassification.SIF_POTENTIAL
            indicators.append("Failure or bypass of energy isolation (LOTO)")
            evidence.append("Work performed adjacent to energized equipment without verified positive isolation")
            potential_consequence = "Arc flash, electrocution, or sudden machine start-up causing crush or amputation injury."
            explanation = "WHY FLAGGED: Incomplete energy isolation during maintenance exposes workers directly to uncontrolled electrical or mechanical release."

        # Documented Rule 5: Suspended Loads & Heavy Rigging
        elif any(w in desc_lower for w in ["suspended load", "crane", "rigging", "sling", "dropped object", "casing pipe", "drill pipe falling"]):
            hazards.append("GRAVITY")
            hazards.append("MECHANICAL")
            is_sif = True
            priority = SIFPriority.HIGH
            classification = SIFClassification.SIF_POTENTIAL
            indicators.append("Suspended load handling with personnel in drop zone")
            evidence.append("Heavy load suspended during lifting operation with personnel exposure")
            potential_consequence = "Dropped load impact causing fatal crush or severe musculoskeletal trauma."
            explanation = "WHY FLAGGED: Suspended load in vicinity of personnel represents a classic fatal precursor event."

        # Documented Rule 6: Minor Routine Observation / Housekeeping (NON_SIF)
        elif any(w in desc_lower for w in ["slip", "trip", "housekeeping", "spill clean", "trash", "minor scratch", "paper cut", "clean water", "ergonomic chair"]) and not any(w in desc_lower for w in ["high", "fall", "rupture", "pressure", "kill", "amputat"]):
            classification = SIFClassification.NON_SIF_POTENTIAL
            priority = SIFPriority.LOW
            hazards.append("LOW_ENERGY")
            indicators.append("Low-energy operational deviation or routine housekeeping issue")
            evidence.append("Report describes minor low-energy observation without credible high-magnitude release pathway")
            potential_consequence = "Minor surface contusion, sprain, or non-disabling first aid treatment."
            explanation = "WHY FLAGGED: Evaluated as non-SIF potential due to the absence of uncontrolled high-magnitude energy or life-altering mechanisms."

        # Ambiguous / Inconclusive -> NEEDS_REVIEW
        else:
            classification = SIFClassification.NEEDS_REVIEW
            priority = SIFPriority.MEDIUM
            indicators.append("Ambiguous hazard context requiring HSE inspector assessment")
            evidence.append("Report narrative does not provide conclusive energy magnitude or barrier state")
            potential_consequence = "Potential consequence cannot be determined without additional operational investigation."
            explanation = "WHY FLAGGED: Report narrative contains ambiguous details; routed to HSE review queue to prevent false clearance."

        return SafetyAnalysisResult(
            classification=classification,
            confidence_estimate=0.85 if is_sif or classification == SIFClassification.NON_SIF_POTENTIAL else 0.50,
            confidence_band=ConfidenceBand.HIGH if is_sif else (ConfidenceBand.LOW if classification == SIFClassification.NEEDS_REVIEW else ConfidenceBand.MEDIUM),
            priority=priority,
            safety_indicators=indicators,
            hazards=hazards,
            precursor_summary=indicators[0] if indicators else "Ambiguous observation condition",
            evidence=evidence,
            actual_outcome=actual_outcome or "Reported as field observation without serious actual injury",
            potential_consequence=potential_consequence,
            explanation=explanation,
            model_name=self.model_name,
            model_version=self.model_version,
            prompt_version=self.prompt_version,
            analysis_timestamp=datetime.now(timezone.utc).isoformat(),
            status="ANALYZED",
        )
