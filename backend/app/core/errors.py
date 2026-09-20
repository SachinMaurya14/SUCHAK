"""
SUCHAK Error Handling Foundation
Translates database exceptions, constraint violations, and missing relations
into clean, structured domain exceptions without leaking raw SQL or connection credentials.
"""
from typing import Optional, Any, Dict


class DatabaseError(Exception):
    """Base exception for database-related operations."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class EntityNotFoundError(DatabaseError):
    """Raised when a requested entity does not exist."""
    def __init__(self, entity_name: str, entity_id: Any):
        super().__init__(
            f"{entity_name} with identifier '{entity_id}' was not found.",
            {"entity": entity_name, "id": str(entity_id)}
        )


class DuplicateEntityError(DatabaseError):
    """Raised when a unique constraint is violated."""
    def __init__(self, entity_name: str, field: str, value: Any):
        super().__init__(
            f"{entity_name} with {field} '{value}' already exists.",
            {"entity": entity_name, "field": field, "value": str(value)}
        )


class ForeignKeyViolationError(DatabaseError):
    """Raised when a referenced foreign key does not exist."""
    def __init__(self, message: str, reference: Optional[str] = None):
        super().__init__(
            message,
            {"reference": reference} if reference else {}
        )


class TenantIsolationError(DatabaseError):
    """Raised when an operation attempts to cross or bypass tenant boundaries."""
    def __init__(self, message: str = "Access denied: entity does not belong to the active organization."):
        super().__init__(message)
