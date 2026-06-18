from uuid import UUID

from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: UUID
    name: str


class AdminCategoryStatsResponse(BaseModel):
    id: UUID
    name: str
    document_count: int
    is_active: bool
