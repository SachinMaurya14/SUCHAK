"""
SUCHAK AI Provider Factory
Phase 4 Safety NLP Engine
Instantiates configured AI Provider with transparent fallback handling.
"""
import os
import logging
from backend.app.core.config import settings
from backend.app.ai.providers.base import AIProvider, AIProviderUnavailableError
from backend.app.ai.providers.gemini import GeminiProvider
from backend.app.ai.providers.rule_based_fallback import RuleBasedFallbackProvider

logger = logging.getLogger("suchak.ai.factory")


def get_ai_provider(provider_type: str = None, allow_fallback: bool = True) -> AIProvider:
    """
    Returns an instance of the configured AI provider.
    If 'gemini' is requested but GEMINI_API_KEY is missing:
      - If allow_fallback is True, logs a warning and returns RuleBasedFallbackProvider.
      - If allow_fallback is False, raises AIProviderUnavailableError.
    """
    target_type = (provider_type or settings.AI_PROVIDER or "gemini").lower().strip()

    if target_type == "gemini":
        api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        if not api_key:
            if allow_fallback:
                logger.warning(
                    "[SUCHAK AI] GEMINI_API_KEY not found in environment. "
                    "Engaging deterministic RuleBasedFallbackProvider for safety evaluation."
                )
                return RuleBasedFallbackProvider()
            raise AIProviderUnavailableError("GEMINI_API_KEY is not configured on the server.")
        return GeminiProvider(api_key=api_key)

    if target_type in ["fallback", "rule_based", "deterministic"]:
        return RuleBasedFallbackProvider()

    raise ValueError(f"Unsupported AI provider type: {target_type}")
