from uuid import UUID

from pydantic import BaseModel


class CommonCodeResponse(BaseModel):
    id: UUID
    group_code: str
    code: str
    code_name: str
    description: str | None = None
    sort_order: int
    is_active: bool

    class Config:
        from_attributes = True
