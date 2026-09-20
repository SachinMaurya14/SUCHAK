"""
SUCHAK Safety Analysis Prompt Registry
Phase 4 Prompt Management
"""
from backend.app.ai.prompts.sif_analysis_v1 import (
    PROMPT_VERSION,
    SYSTEM_PROMPT_V1,
    build_user_analysis_prompt,
)

__all__ = ["PROMPT_VERSION", "SYSTEM_PROMPT_V1", "build_user_analysis_prompt"]
