"""
SUCHAK Safety Report Text Preprocessor
Phase 4 Safety NLP Engine
Normalizes formatting, cleans input artifacts, preserves technical jargon,
and prepares safe payload structures for the inference pipeline.
"""
import re
from typing import Optional
from pydantic import BaseModel, Field


class TextPreprocessingError(Exception):
    """Raised when safety report text fails preprocessing validation."""
    pass


class PreprocessedText(BaseModel):
    original_text: str
    normalized_text: str
    char_count: int
    word_count: int
    detected_language: str = "en"
    has_truncation: bool = False


class TextPreprocessor:
    """
    Sanitizes and normalizes report text while preserving critical HSE domain
    terminology (e.g. pressure PSI, LOTO, BOP, whip check, H2S PPM, rig numbers).
    """

    def __init__(self, max_length: int = 10000):
        self.max_length = max_length

    def preprocess(self, text: Optional[str]) -> PreprocessedText:
        if not text or not isinstance(text, str):
            raise TextPreprocessingError("Safety report narrative cannot be empty or null.")

        original = text
        stripped = text.strip()

        if len(stripped) < 5:
            raise TextPreprocessingError("Safety report narrative must contain at least 5 meaningful characters.")

        # Remove null bytes or non-printable ASCII control characters (keeping \n and \t)
        cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', stripped)

        # Normalize carriage returns and newlines
        cleaned = re.sub(r'\r\n|\r', '\n', cleaned)

        # Collapse excessive newlines (>2 newlines into 2)
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

        # Collapse consecutive spaces and tabs (preserving single whitespace)
        cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned)

        has_truncation = False
        if len(cleaned) > self.max_length:
            cleaned = cleaned[:self.max_length].rstrip()
            has_truncation = True

        words = cleaned.split()
        word_count = len(words)

        # Basic language heuristic: ensure text is processable
        # Future multilingual phase can hook external language detector here
        detected_lang = "en"
        non_ascii = len(re.findall(r'[^\x00-\x7F]', cleaned))
        if len(cleaned) > 0 and (non_ascii / len(cleaned)) > 0.6:
            # High non-ascii density (e.g., regional script)
            detected_lang = "multilingual_indic_or_other"

        return PreprocessedText(
            original_text=original,
            normalized_text=cleaned,
            char_count=len(cleaned),
            word_count=word_count,
            detected_language=detected_lang,
            has_truncation=has_truncation,
        )
