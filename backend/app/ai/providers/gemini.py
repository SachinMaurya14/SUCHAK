"""
SUCHAK Gemini AI Provider Implementation
Phase 4 Safety NLP Engine
Server-side integration with Gemini API utilizing @google/genai SDK.
NEVER exposes API keys to client JavaScript or browser logs.
"""
import os
import time
import logging
from typing import Optional, Dict, Any

from google import genai
from google.genai import types

from backend.app.core.config import settings
from backend.app.ai.providers.base import AIProvider, AIProviderError, AIProviderUnavailableError
from backend.app.ai.schemas.safety_analysis import SafetyAnalysisResult
from backend.app.ai.prompts.sif_analysis_v1 import (
    PROMPT_VERSION,
    SYSTEM_PROMPT_V1,
    build_user_analysis_prompt,
)
from backend.app.ai.validators.analysis_validator import AnalysisValidator, AnalysisValidationError

logger = logging.getLogger("suchak.ai.gemini")


class GeminiProvider(AIProvider):
    """
    Production prototype AI provider for Safety NLP using Gemini models.
    Operates with lazy initialization, strict JSON schema output, and bounded retries.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout: Optional[int] = None,
        max_retries: Optional[int] = None,
    ):
        self._api_key = api_key or settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        self._model_name = model_name or settings.AI_MODEL or "gemini-3.8-flash"
        self._timeout = timeout or settings.AI_TIMEOUT or 30
        self._max_retries = max_retries if max_retries is not None else settings.AI_MAX_RETRIES
        self._client: Optional[genai.Client] = None

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def model_version(self) -> str:
        return f"{self._model_name}-v1"

    @property
    def prompt_version(self) -> str:
        return PROMPT_VERSION

    def _get_client(self) -> genai.Client:
        if self._client is None:
            key = self._api_key or os.getenv("GEMINI_API_KEY")
            if not key:
                raise AIProviderUnavailableError(
                    "GEMINI_API_KEY is not configured on the server. AI inference is unavailable."
                )
            try:
                self._client = genai.Client(api_key=key)
            except Exception as e:
                raise AIProviderUnavailableError(f"Failed to initialize Gemini client: {str(e)}")
        return self._client

    def analyze_report(
        self,
        description: str,
        actual_outcome: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> SafetyAnalysisResult:
        client = self._get_client()
        prompt_text = build_user_analysis_prompt(description, actual_outcome, context)

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT_V1,
            response_mime_type="application/json",
            temperature=0.1,  # Low temperature for deterministic HSE evaluation
        )

        last_err: Optional[Exception] = None
        retries = max(0, self._max_retries)

        for attempt in range(retries + 1):
            try:
                response = client.models.generate_content(
                    model=self._model_name,
                    contents=prompt_text,
                    config=config,
                )

                if not response or not response.text:
                    raise AIProviderError("Gemini returned an empty response body.")

                raw_text = response.text
                return AnalysisValidator.validate(
                    raw_output=raw_text,
                    model_name=self.model_name,
                    model_version=self.model_version,
                    prompt_version=self.prompt_version,
                )

            except AnalysisValidationError as e:
                logger.warning(f"AI response validation error (attempt {attempt + 1}/{retries + 1}): {str(e)}")
                last_err = e
            except Exception as e:
                err_msg = str(e)
                logger.warning(f"Gemini API inference error (attempt {attempt + 1}/{retries + 1}): {err_msg}")
                # Rate limit, quota error, or model overload checks
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    last_err = AIProviderUnavailableError(f"Gemini quota or rate limit exceeded: {err_msg}")
                elif "503" in err_msg or "UNAVAILABLE" in err_msg or "overloaded" in err_msg.lower() or "high demand" in err_msg.lower():
                    last_err = AIProviderUnavailableError(f"Gemini model API is overloaded: {err_msg}")
                elif "401" in err_msg or "API_KEY_INVALID" in err_msg:
                    last_err = AIProviderUnavailableError("Invalid or unauthorized Gemini API key.")
                else:
                    last_err = AIProviderError(f"Gemini inference failed: {err_msg}")

                if attempt < retries:
                    time.sleep(1.0 * (attempt + 1))

        if isinstance(last_err, AIProviderUnavailableError):
            raise last_err
        raise AIProviderError(f"Safety NLP inference failed after {retries + 1} attempts: {str(last_err)}")
