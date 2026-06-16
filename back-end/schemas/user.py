from pydantic import BaseModel
from pydantic import Field


class UserProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class UserPasswordUpdateRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str


class UserPasswordUpdateResponse(BaseModel):
    message: str
