"""
Pydantic schemas for User Settings
Request/Response validation
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TwoFAMethod(str, Enum):
    """2FA methods"""
    totp = "totp"
    sms = "sms"
    email = "email"


class EmailFrequency(str, Enum):
    """Email notification frequency options"""
    immediate = "immediate"  # Send immediately
    daily = "daily"          # Daily digest
    weekly = "weekly"        # Weekly digest
    never = "never"          # Disable email notifications


# ==================== User Profile Schemas ====================

class UpdateProfileRequest(BaseModel):
    """Request to update user profile"""
    bio: Optional[str] = Field(None, max_length=500)
    phone_number: Optional[str] = Field(None, regex=r"^\+?[1-9]\d{1,14}$")
    country: Optional[str] = Field(None, max_length=50)
    timezone: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(None, max_length=10)
    theme: Optional[str] = Field(None, regex=r"^(light|dark|auto)$")
    is_profile_public: Optional[bool] = None
    show_portfolio_summary: Optional[bool] = None

    class Config:
        schema_extra = {
            "example": {
                "bio": "Quantitative investor focused on leveraged buy & hold",
                "phone_number": "+5511999999999",
                "country": "BR",
                "timezone": "America/Sao_Paulo",
                "language": "pt_BR",
                "theme": "dark",
                "is_profile_public": False,
                "show_portfolio_summary": True
            }
        }


class ProfileResponse(BaseModel):
    """Response with user profile information"""
    id: int
    user_id: int
    bio: Optional[str]
    avatar_url: Optional[str]
    phone_number: Optional[str]
    date_of_birth: Optional[datetime]
    country: Optional[str]
    timezone: str
    language: str
    theme: str
    is_profile_public: bool
    show_portfolio_summary: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Password & Security Schemas ====================

class ChangePasswordRequest(BaseModel):
    """Request to change password"""
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @validator("new_password")
    def validate_new_password(cls, v, values):
        if "current_password" in values and v == values["current_password"]:
            raise ValueError("New password must be different from current password")
        return v

    @validator("confirm_password")
    def validate_confirm_password(cls, v, values):
        if "new_password" in values and v != values["new_password"]:
            raise ValueError("Passwords do not match")
        return v

    class Config:
        schema_extra = {
            "example": {
                "current_password": "CurrentPassword123!",
                "new_password": "NewPassword123!",
                "confirm_password": "NewPassword123!"
            }
        }


class PasswordChangeResponse(BaseModel):
    """Response after successful password change"""
    success: bool
    message: str
    changed_at: datetime

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Password changed successfully",
                "changed_at": "2026-07-04T10:30:00Z"
            }
        }


# ==================== 2FA Schemas ====================

class Setup2FARequest(BaseModel):
    """Request to set up 2FA"""
    method: TwoFAMethod = Field(..., description="2FA method to use")
    phone_number: Optional[str] = Field(None, description="Required for SMS method")

    class Config:
        schema_extra = {
            "example": {
                "method": "totp",
                "phone_number": None
            }
        }


class Setup2FAResponse(BaseModel):
    """Response with 2FA setup details"""
    setup_id: str = Field(..., description="Temporary setup ID for verification")
    qr_code_url: Optional[str] = Field(None, description="QR code URL for TOTP")
    secret: Optional[str] = Field(None, description="Manual entry secret for TOTP")
    backup_codes: List[str] = Field(..., description="Backup codes for recovery")
    method: TwoFAMethod

    class Config:
        schema_extra = {
            "example": {
                "setup_id": "setup_123456",
                "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/...",
                "secret": "JBSWY3DPEBLW64TMMQ======",
                "backup_codes": ["code1", "code2", "code3"],
                "method": "totp"
            }
        }


class Verify2FARequest(BaseModel):
    """Request to verify 2FA setup"""
    setup_id: str = Field(..., description="Setup ID from setup response")
    code: str = Field(..., min_length=6, max_length=6, regex=r"^\d{6}$")

    class Config:
        schema_extra = {
            "example": {
                "setup_id": "setup_123456",
                "code": "123456"
            }
        }


class Disable2FARequest(BaseModel):
    """Request to disable 2FA"""
    password: str = Field(..., min_length=8, description="User password for confirmation")
    code: Optional[str] = Field(None, description="2FA code if 2FA is currently enabled")

    class Config:
        schema_extra = {
            "example": {
                "password": "UserPassword123!",
                "code": "123456"
            }
        }


class SecurityResponse(BaseModel):
    """Response with security settings"""
    id: int
    user_id: int
    two_fa_enabled: bool
    two_fa_method: Optional[TwoFAMethod]
    require_mfa_on_login: bool
    idle_timeout_minutes: int
    recovery_email: Optional[str]
    two_fa_enabled_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Preferences Schemas ====================

class UpdatePreferencesRequest(BaseModel):
    """Request to update preferences"""
    email_alerts: Optional[bool] = None
    push_notifications: Optional[bool] = None
    sms_alerts: Optional[bool] = None
    marketing_emails: Optional[bool] = None
    email_frequency: Optional[EmailFrequency] = None
    daily_digest: Optional[bool] = None
    daily_digest_time: Optional[str] = Field(None, regex=r"^\d{2}:\d{2}$")
    price_alerts: Optional[bool] = None
    milestone_alerts: Optional[bool] = None
    allow_analytics: Optional[bool] = None
    allow_improvements: Optional[bool] = None

    class Config:
        schema_extra = {
            "example": {
                "email_alerts": True,
                "push_notifications": False,
                "email_frequency": "daily",
                "daily_digest": True,
                "daily_digest_time": "09:00",
                "allow_analytics": True
            }
        }


class PreferencesResponse(BaseModel):
    """Response with user preferences"""
    id: int
    user_id: int
    email_alerts: bool
    push_notifications: bool
    sms_alerts: bool
    marketing_emails: bool
    email_frequency: EmailFrequency
    daily_digest: bool
    daily_digest_time: str
    price_alerts: bool
    milestone_alerts: bool
    allow_analytics: bool
    allow_improvements: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== API Key Schemas ====================

class CreateAPIKeyRequest(BaseModel):
    """Request to create API key"""
    name: str = Field(..., min_length=1, max_length=100)
    permissions: str = Field("read", regex=r"^(read|write|admin)(,(read|write|admin))*$")
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)

    class Config:
        schema_extra = {
            "example": {
                "name": "Portfolio Integration",
                "permissions": "read",
                "expires_in_days": 90
            }
        }


class APIKeyResponse(BaseModel):
    """Response with API key details"""
    id: int
    user_id: int
    name: str
    last_four: str
    permissions: str
    is_active: bool
    last_used_at: Optional[datetime]
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class APIKeyCreateResponse(BaseModel):
    """Response when creating API key with full key"""
    id: int
    name: str
    key: str  # Full API key (shown only once)
    last_four: str
    permissions: str
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        schema_extra = {
            "example": {
                "id": 1,
                "name": "Portfolio Integration",
                "key": "sk_live_abc123def456...",
                "last_four": "def456",
                "permissions": "read",
                "created_at": "2026-07-04T10:00:00Z",
                "expires_at": "2026-10-02T10:00:00Z"
            }
        }


# ==================== Activity Log Schemas ====================

class ActivityLogResponse(BaseModel):
    """Response with activity log entry"""
    id: int
    user_id: int
    activity_type: str
    description: str
    ip_address: Optional[str]
    resource_type: Optional[str]
    resource_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityLogsListResponse(BaseModel):
    """Response with paginated activity logs"""
    items: List[ActivityLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    class Config:
        schema_extra = {
            "example": {
                "items": [],
                "total": 100,
                "page": 1,
                "page_size": 20,
                "total_pages": 5
            }
        }


# ==================== Session Schemas ====================

class SessionResponse(BaseModel):
    """Response with user session information"""
    id: int
    user_id: int
    device_name: str
    device_type: str
    browser: Optional[str]
    os_name: Optional[str]
    ip_address: str
    country: Optional[str]
    is_current: bool
    is_trusted: bool
    created_at: datetime
    last_activity_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class SessionsListResponse(BaseModel):
    """Response with list of sessions"""
    items: List[SessionResponse]
    total: int

    class Config:
        schema_extra = {
            "example": {
                "items": [],
                "total": 3
            }
        }


# ==================== Combined Responses ====================

class SettingsSummaryResponse(BaseModel):
    """Summary of all user settings"""
    profile: ProfileResponse
    security: SecurityResponse
    preferences: PreferencesResponse
    sessions_active: int
    api_keys_active: int

    class Config:
        schema_extra = {
            "example": {
                "profile": {},
                "security": {},
                "preferences": {},
                "sessions_active": 2,
                "api_keys_active": 1
            }
        }


class ErrorResponse(BaseModel):
    """Error response"""
    success: bool = False
    error: str
    detail: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "success": False,
                "error": "Unauthorized",
                "detail": "Invalid authentication token"
            }
        }


# ==================== API Key Rotation Schemas ====================

class RotateAPIKeyRequest(BaseModel):
    """Request to rotate API key"""
    password: str = Field(..., min_length=8, description="User password for confirmation")

    class Config:
        schema_extra = {
            "example": {
                "password": "UserPassword123!"
            }
        }


class RotateAPIKeyResponse(BaseModel):
    """Response after rotating API key"""
    id: int
    name: str
    new_key: str  # New API key (shown only once)
    last_four: str
    permissions: str
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        schema_extra = {
            "example": {
                "id": 1,
                "name": "Portfolio Integration",
                "new_key": "sk_live_xyz789uvw012...",
                "last_four": "uvw012",
                "permissions": "read",
                "created_at": "2026-07-04T10:00:00Z",
                "expires_at": "2026-10-02T10:00:00Z"
            }
        }


# ==================== Account Deletion Schemas ====================

class RequestAccountDeletionRequest(BaseModel):
    """Request to initiate account deletion"""
    password: str = Field(..., min_length=8, description="User password for confirmation")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for deletion")

    class Config:
        schema_extra = {
            "example": {
                "password": "UserPassword123!",
                "reason": "No longer using the platform"
            }
        }


class AccountDeletionResponse(BaseModel):
    """Response for account deletion request"""
    success: bool
    message: str
    deletion_scheduled_for: datetime
    confirmation_required: bool

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Account deletion scheduled. Please confirm via email.",
                "deletion_scheduled_for": "2026-07-11T10:00:00Z",
                "confirmation_required": True
            }
        }


class AccountDeletionStatusResponse(BaseModel):
    """Response for account deletion status"""
    scheduled_for_deletion: bool
    deletion_date: Optional[datetime]
    days_until_deletion: Optional[int]
    confirmation_sent: bool
    confirmation_deadline: Optional[datetime]

    class Config:
        schema_extra = {
            "example": {
                "scheduled_for_deletion": True,
                "deletion_date": "2026-07-11T10:00:00Z",
                "days_until_deletion": 7,
                "confirmation_sent": True,
                "confirmation_deadline": "2026-07-08T10:00:00Z"
            }
        }
