"""
SUCHAK AI Provider Base Abstraction
Phase 4 Safety NLP Engine
Decouples business application layer from specific LLM vendors.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

from backend.app.ai.schemas.safety_analysis import SafetyAnalysisResult


class AIProviderError(Exception):
    """Base exception for all AI provider inference failures."""
    pass


class AIProviderUnavailableError(AIProviderError):
    """Raised when an AI provider is unconfigured, unreachable, or rate-limited."""
    pass


class AIProvider(ABC):
    """
    Abstract contract for safety report analysis providers.
    Enables pluggable models, fallback engines, and vendor transitions.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Provider identification string (e.g. 'gemini', 'fallback')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Underlying model name (e.g. 'gemini-3.8-flash')."""
        pass

    @property
    @abstractmethod
    def model_version(self) -> str:
        """Model version or release tag."""
        pass

    @property
    @abstractmethod
    def prompt_version(self) -> str:
        """Prompt version applied."""
        pass

    @abstractmethod
    def analyze_report(
        self,
        description: str,
        actual_outcome: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> SafetyAnalysisResult:
        """
        Executes safety analysis on preprocessed report narrative.
        Returns validated SafetyAnalysisResult or raises AIProviderError.
        """
        pass
