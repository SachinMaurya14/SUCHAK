"""
SUCHAK Base Repository & Tenant Scoping Abstraction
Phase 2 Persistence Architecture
Enforces organization_id filtering for all multi-tenant queries.
"""
from typing import Generic, TypeVar, Type, Optional, List, Any
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from backend.app.models.base import Base

T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    """Generic repository providing standardized CRUD and tenant-isolation helpers."""
    
    def __init__(self, model: Type[T], session: Session):
        self.model = model
        self.session = session

    def get_by_id(self, entity_id: uuid.UUID) -> Optional[T]:
        """Fetch entity by primary key."""
        return self.session.get(self.model, entity_id)

    def get_by_id_scoped(self, entity_id: uuid.UUID, organization_id: uuid.UUID) -> Optional[T]:
        """
        Fetch entity by primary key with strict organization isolation.
        Raises ValueError if model is not organization-scoped.
        """
        if not hasattr(self.model, "organization_id"):
            raise ValueError(f"Model {self.model.__name__} does not have an organization_id attribute.")
        
        stmt = select(self.model).where(
            self.model.id == entity_id,  # type: ignore
            self.model.organization_id == organization_id,  # type: ignore
        )
        return self.session.execute(stmt).scalar_one_or_none()

    def list_scoped(
        self,
        organization_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> List[T]:
        """List entities scoped strictly to an organization."""
        if not hasattr(self.model, "organization_id"):
            raise ValueError(f"Model {self.model.__name__} does not have an organization_id attribute.")
        
        stmt = (
            select(self.model)
            .where(self.model.organization_id == organization_id)  # type: ignore
            .offset(skip)
            .limit(limit)
        )
        return list(self.session.execute(stmt).scalars().all())

    def count_scoped(self, organization_id: uuid.UUID) -> int:
        """Count entities scoped to an organization."""
        if not hasattr(self.model, "organization_id"):
            raise ValueError(f"Model {self.model.__name__} does not have an organization_id attribute.")
        
        stmt = (
            select(func.count(self.model.id))  # type: ignore
            .where(self.model.organization_id == organization_id)  # type: ignore
        )
        return self.session.execute(stmt).scalar_one() or 0

    def add(self, entity: T) -> T:
        """Add a new entity instance to the session."""
        self.session.add(entity)
        self.session.flush()
        return entity

    def delete(self, entity: T) -> None:
        """Remove an entity instance from the session."""
        self.session.delete(entity)
        self.session.flush()
