from datetime import datetime

from pydantic import BaseModel
from pydantic import Field


class AdminPromptResponse(BaseModel):
    prompt_key: str
    name: str
    description: str | None = None
    content: str
    updated_at: datetime


class AdminPromptUpdateRequest(BaseModel):
    content: str = Field(min_length=1)
