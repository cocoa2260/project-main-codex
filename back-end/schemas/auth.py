from typing import Optional

from pydantic import BaseModel
from pydantic import EmailStr


class SignupRequest(BaseModel):
    email:EmailStr
    password:str
    name:str


class LoginRequest(BaseModel):
    email:EmailStr
    password:str


class UserResponse(BaseModel):
    id:str
    email:EmailStr
    name:Optional[str]=None
    role:str
    status:str


class TokenResponse(BaseModel):
    access_token:str
    token_type:str="bearer"
    user:UserResponse
