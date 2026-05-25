from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import RiskProfile


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    risk_profile: RiskProfile = RiskProfile.balanced


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    risk_profile: Optional[RiskProfile] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    risk_profile: RiskProfile
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
