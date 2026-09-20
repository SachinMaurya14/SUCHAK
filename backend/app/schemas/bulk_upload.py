"""
SUCHAK Bulk Ingestion & Validation Schemas
Phase 3 Core Contracts
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class BulkUploadRowValidation(BaseModel):
    row_number: int
    raw_data: Dict[str, Any]
    is_valid: bool
    is_duplicate: bool = False
    errors: List[str] = []
    warnings: List[str] = []
    resolved: Optional[Dict[str, Any]] = None


class BulkUploadValidateResponse(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    rows: List[BulkUploadRowValidation]


class BulkUploadCommitRequest(BaseModel):
    rows: List[Dict[str, Any]] = Field(..., min_length=1, max_length=1000)
    skip_duplicates: bool = True


class BulkUploadCommitResponse(BaseModel):
    imported_count: int
    skipped_count: int
    duplicate_count: int
    failed_count: int
    created_reports: List[Dict[str, Any]] = []
    errors: List[str] = []
