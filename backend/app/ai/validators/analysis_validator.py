"""
SUCHAK Safety Analysis Output Validator
Phase 4 Safety NLP Engine
Enforces strict schema validation, JSON sanitization, and business integrity rules.
Never trusts raw LLM output blindly.
"""
import json
import re
from typing import Dict, Any, Optional
from pydantic import ValidationError

from backend.app.ai.schemas.safety_analysis import SafetyAnalysisResult, SIFClassification


class AnalysisValidationError(Exception):
    """Raised when raw AI output fails parsing or schema validation."""
    pass


class AnalysisValidator:
    """
    Sanitizes, parses, and validates raw AI responses into verified SafetyAnalysisResult instances.
    """

    @classmethod
    def extract_json_payload(cls, raw_text: str) -> str:
        """
        Safely extracts JSON string from potential markdown code blocks or surrounding whitespace.
        """
        clean = raw_text.strip()
        # Handle markdown blocks ```json ... ``` or ``` ... ```
        if "```" in clean:
            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', clean, re.IGNORECASE)
            if match:
                clean = match.group(1).strip()
            else:
                # Remove triple backticks if present
                clean = clean.replace("```json", "").replace("```", "").strip()

        # If there are leading/trailing non-json characters, find outer braces
        start = clean.find('{')
        end = clean.rfind('}')
        if start != -1 and end != -1 and end > start:
            clean = clean[start:end + 1]

        return clean

    @classmethod
    def validate(
        cls,
        raw_output: str,
        model_name: str,
        model_version: str,
        prompt_version: str,
    ) -> SafetyAnalysisResult:
        """
        Parses and validates raw LLM output against the strict SafetyAnalysisResult schema.
        """
        if not raw_output or not raw_output.strip():
            raise AnalysisValidationError("AI provider returned an empty response.")

        json_str = cls.extract_json_payload(raw_output)

        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError as e:
            raise AnalysisValidationError(f"Malformed JSON in AI response: {str(e)}")

        if not isinstance(parsed, dict):
            raise AnalysisValidationError("AI response did not parse into a JSON object dictionary.")

        # Ensure model metadata is injected
        parsed["model_name"] = model_name
        parsed["model_version"] = model_version
        parsed["prompt_version"] = prompt_version

        # Normalize confidence if presented as percentage (e.g. 85 instead of 0.85)
        conf = parsed.get("confidence_estimate")
        if isinstance(conf, (int, float)) and conf > 1.0 and conf <= 100.0:
            parsed["confidence_estimate"] = round(conf / 100.0, 4)

        try:
            result = SafetyAnalysisResult.model_validate(parsed)
            return result
        except ValidationError as e:
            raise AnalysisValidationError(f"AI response failed schema validation: {str(e)}")
