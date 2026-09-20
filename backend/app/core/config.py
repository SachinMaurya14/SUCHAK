"""
SUCHAK Backend Configuration
Phase 1 Foundation
"""
from typing import List, Union, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "SUCHAK"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = "development"
    
    # CORS Origins (supports JSON list or comma-separated string)
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
    ]

    @property
    def cors_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        if isinstance(self.CORS_ORIGINS, str):
            if self.CORS_ORIGINS.startswith("[") and self.CORS_ORIGINS.endswith("]"):
                import json
                try:
                    return json.loads(self.CORS_ORIGINS)
                except Exception:
                    pass
            return [x.strip() for x in self.CORS_ORIGINS.split(",") if x.strip()]
        return ["http://localhost:3000"]
    
    # Database Configuration (Phase 2)
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/suchak_db"
    TEST_DATABASE_URL: str = "sqlite:///:memory:"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_ECHO: bool = False
    
    SECRET_KEY: str = "temporary_phase1_secret_key_change_in_production"
    
    # AI Engine Configuration (Phase 4)
    GEMINI_API_KEY: Optional[str] = None
    AI_PROVIDER: str = "gemini"  # "gemini" or "fallback"
    AI_MODEL: str = "gemini-3.8-flash"  # Default non-deprecated model for basic text/NLP tasks
    AI_TIMEOUT: int = 30
    AI_MAX_RETRIES: int = 2
    MAX_REPORT_TEXT_LENGTH: int = 10000
    PROMPT_VERSION: str = "SIF_ANALYSIS_PROMPT_V1"
    
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore",
    )

settings = Settings()

