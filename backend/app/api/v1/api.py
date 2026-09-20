from fastapi import APIRouter
from backend.app.api.v1.endpoints import health, reports, references

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(references.router, tags=["References"])

