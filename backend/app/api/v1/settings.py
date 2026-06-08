"""
User Settings API endpoints
Profile, Security, Preferences, Sessions, API Keys, Activity Logs
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import pyotp
import qrcode
import io
import base64
from typing import Optional, List

from app.core.database import get_db
from app.core.security import get_current_user, verify_password, get_password_hash
from app.models.user import User
from app.models.user_settings import (
    UserProfile, SecuritySettings, PreferencesSettings, EmailFrequency,
    APIKey, ActivityLog, UserSession, ActivityType
)
from app.schemas.settings import (
    UpdateProfileRequest, ProfileResponse,
    ChangePasswordRequest, PasswordChangeResponse,
    Setup2FARequest, Setup2FAResponse, Verify2FARequest, Disable2FARequest,
    SecurityResponse, UpdatePreferencesRequest, PreferencesResponse,
    CreateAPIKeyRequest, APIKeyResponse, APIKeyCreateResponse,
    ActivityLogResponse, ActivityLogsListResponse,
    SessionResponse, SessionsListResponse, SettingsSummaryResponse,
    ErrorResponse
)

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


# ==================== Helper Functions ====================

def get_or_create_user_settings(user: User, db: Session):
    """Ensure user has all settings objects created"""
    if not user.profile:
        user.profile = UserProfile(user_id=user.id)
        db.add(user.profile)

    if not user.security_settings:
        user.security_settings = SecuritySettings(user_id=user.id)
        db.add(user.security_settings)

    if not user.preferences_settings:
        user.preferences_settings = PreferencesSettings(user_id=user.id)
        db.add(user.preferences_settings)

    db.commit()
    db.refresh(user)
    return user


def log_activity(
    db: Session,
    user_id: int,
    activity_type: ActivityType,
    description: str,
    ip_address: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    metadata: Optional[str] = None
):
    """Log user activity to audit trail"""
    activity = ActivityLog(
        user_id=user_id,
        activity_type=activity_type,
        description=description,
        ip_address=ip_address,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata=metadata
    )
    db.add(activity)
    db.commit()


# ==================== Profile Endpoints ====================

@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user profile information"""
    user = get_or_create_user_settings(current_user, db)

    if not user.profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return user.profile


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile information"""
    user = get_or_create_user_settings(current_user, db)
    profile = user.profile

    # Update fields if provided
    if request.bio is not None:
        profile.bio = request.bio
    if request.phone_number is not None:
        profile.phone_number = request.phone_number
    if request.country is not None:
        profile.country = request.country
    if request.timezone is not None:
        profile.timezone = request.timezone
    if request.language is not None:
        profile.language = request.language
    if request.theme is not None:
        profile.theme = request.theme
    if request.is_profile_public is not None:
        profile.is_profile_public = request.is_profile_public
    if request.show_portfolio_summary is not None:
        profile.show_portfolio_summary = request.show_portfolio_summary

    profile.updated_at = datetime.utcnow()
    db.add(profile)
    db.commit()
    db.refresh(profile)

    log_activity(
        db, current_user.id, ActivityType.profile_updated,
        "Profile information updated", resource_type="profile"
    )

    return profile


@router.post("/profile/picture")
def upload_profile_picture(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload profile picture (placeholder - actual file upload implementation)"""
    user = get_or_create_user_settings(current_user, db)

    # TODO: Implement file upload to S3 or similar
    # For now, return placeholder
    return {
        "success": True,
        "message": "Profile picture endpoint ready for implementation",
        "avatar_url": None
    }


@router.delete("/profile/picture")
def delete_profile_picture(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete profile picture"""
    user = get_or_create_user_settings(current_user, db)

    if user.profile:
        user.profile.avatar_url = None
        db.add(user.profile)
        db.commit()

    log_activity(
        db, current_user.id, ActivityType.profile_updated,
        "Profile picture removed", resource_type="profile"
    )

    return {"success": True, "message": "Profile picture deleted"}


# ==================== Password Endpoints ====================

@router.post("/password/change", response_model=PasswordChangeResponse)
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    # Verify current password
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    # Update password
    current_user.hashed_password = get_password_hash(request.new_password)
    db.add(current_user)
    db.commit()

    log_activity(
        db, current_user.id, ActivityType.password_change,
        "Password changed successfully"
    )

    return PasswordChangeResponse(
        success=True,
        message="Password changed successfully",
        changed_at=datetime.utcnow()
    )


# ==================== 2FA Endpoints ====================

def generate_qr_code(secret: str, email: str) -> str:
    """Generate QR code for TOTP setup"""
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=email, issuer_name="Leveraged Buy & Hold")

    qr = qrcode.QRCode()
    qr.add_data(uri)
    qr.make()

    img = qr.make_image()
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)

    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_base64}"


def generate_backup_codes(count: int = 10) -> List[str]:
    """Generate backup codes for 2FA recovery"""
    import secrets
    codes = []
    for _ in range(count):
        code = secrets.token_hex(4).upper()
        codes.append(f"{code[:4]}-{code[4:]}")
    return codes


@router.post("/2fa/setup", response_model=Setup2FAResponse)
def setup_2fa(
    request: Setup2FARequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initiate 2FA setup"""
    user = get_or_create_user_settings(current_user, db)

    if user.security_settings.two_fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )

    if request.method.value == "totp":
        # Generate TOTP secret
        secret = pyotp.random_base32()
        qr_code_url = generate_qr_code(secret, current_user.email)
        backup_codes = generate_backup_codes()

        # Store temporarily (in real implementation, use session storage)
        # For now, we'll store in security_settings as pending
        import json
        user.security_settings.totp_secret = secret
        user.security_settings.backup_codes = json.dumps(backup_codes)
        db.add(user.security_settings)
        db.commit()

        return Setup2FAResponse(
            setup_id=f"setup_{current_user.id}_{datetime.utcnow().timestamp()}",
            qr_code_url=qr_code_url,
            secret=secret,
            backup_codes=backup_codes,
            method=request.method
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"2FA method {request.method} not yet implemented"
    )


@router.post("/2fa/verify", response_model=SecurityResponse)
def verify_2fa(
    request: Verify2FARequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify and complete 2FA setup"""
    user = get_or_create_user_settings(current_user, db)
    settings = user.security_settings

    if not settings.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending 2FA setup found"
        )

    # Verify the code
    totp = pyotp.TOTP(settings.totp_secret)
    if not totp.verify(request.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA code"
        )

    # Enable 2FA
    settings.two_fa_enabled = True
    settings.two_fa_method = "totp"
    settings.two_fa_enabled_at = datetime.utcnow()
    db.add(settings)
    db.commit()
    db.refresh(settings)

    log_activity(
        db, current_user.id, ActivityType.two_fa_enabled,
        "Two-factor authentication enabled"
    )

    return settings


@router.post("/2fa/disable")
def disable_2fa(
    request: Disable2FARequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable 2FA"""
    user = get_or_create_user_settings(current_user, db)
    settings = user.security_settings

    if not settings.two_fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )

    # Verify password
    if not verify_password(request.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password is incorrect"
        )

    # If 2FA is currently enabled, verify the code
    if settings.two_fa_enabled and request.code:
        totp = pyotp.TOTP(settings.totp_secret)
        if not totp.verify(request.code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA code"
            )

    # Disable 2FA
    settings.two_fa_enabled = False
    settings.two_fa_method = None
    settings.totp_secret = None
    settings.backup_codes = None
    db.add(settings)
    db.commit()

    log_activity(
        db, current_user.id, ActivityType.two_fa_disabled,
        "Two-factor authentication disabled"
    )

    return {
        "success": True,
        "message": "Two-factor authentication disabled"
    }


# ==================== Security Endpoints ====================

@router.get("/security", response_model=SecurityResponse)
def get_security_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get security settings"""
    user = get_or_create_user_settings(current_user, db)
    return user.security_settings


# ==================== Preferences Endpoints ====================

@router.get("/preferences", response_model=PreferencesResponse)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user preferences"""
    user = get_or_create_user_settings(current_user, db)
    return user.preferences_settings


@router.put("/preferences", response_model=PreferencesResponse)
def update_preferences(
    request: UpdatePreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user preferences"""
    user = get_or_create_user_settings(current_user, db)
    prefs = user.preferences_settings

    # Update fields if provided
    if request.email_alerts is not None:
        prefs.email_alerts = request.email_alerts
    if request.push_notifications is not None:
        prefs.push_notifications = request.push_notifications
    if request.sms_alerts is not None:
        prefs.sms_alerts = request.sms_alerts
    if request.marketing_emails is not None:
        prefs.marketing_emails = request.marketing_emails
    if request.email_frequency is not None:
        prefs.email_frequency = request.email_frequency
    if request.daily_digest is not None:
        prefs.daily_digest = request.daily_digest
    if request.daily_digest_time is not None:
        prefs.daily_digest_time = request.daily_digest_time
    if request.price_alerts is not None:
        prefs.price_alerts = request.price_alerts
    if request.milestone_alerts is not None:
        prefs.milestone_alerts = request.milestone_alerts
    if request.allow_analytics is not None:
        prefs.allow_analytics = request.allow_analytics
    if request.allow_improvements is not None:
        prefs.allow_improvements = request.allow_improvements

    prefs.updated_at = datetime.utcnow()
    db.add(prefs)
    db.commit()
    db.refresh(prefs)

    return prefs


# ==================== API Key Endpoints ====================

@router.post("/api-keys", response_model=APIKeyCreateResponse)
def create_api_key(
    request: CreateAPIKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new API key"""
    import hashlib

    # Generate key
    raw_key = APIKey.generate_key()
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    # Create API key record
    api_key = APIKey(
        user_id=current_user.id,
        name=request.name,
        key_hash=key_hash,
        last_four=raw_key[-4:],
        permissions=request.permissions,
        is_active=True
    )

    if request.expires_in_days:
        api_key.expires_at = datetime.utcnow() + timedelta(days=request.expires_in_days)

    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    log_activity(
        db, current_user.id, ActivityType.api_key_created,
        f"API key created: {request.name}", resource_type="api_key", resource_id=api_key.id
    )

    return APIKeyCreateResponse(
        id=api_key.id,
        name=api_key.name,
        key=raw_key,
        last_four=api_key.last_four,
        permissions=api_key.permissions,
        created_at=api_key.created_at,
        expires_at=api_key.expires_at
    )


@router.get("/api-keys", response_model=List[APIKeyResponse])
def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's API keys"""
    keys = db.query(APIKey).filter(
        APIKey.user_id == current_user.id,
        APIKey.is_active == True
    ).all()
    return keys


@router.delete("/api-keys/{key_id}")
def revoke_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke an API key"""
    api_key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.user_id == current_user.id
    ).first()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.is_active = False
    api_key.revoked_at = datetime.utcnow()
    db.add(api_key)
    db.commit()

    log_activity(
        db, current_user.id, ActivityType.api_key_revoked,
        f"API key revoked: {api_key.name}", resource_type="api_key", resource_id=api_key.id
    )

    return {"success": True, "message": "API key revoked"}


# ==================== Session Endpoints ====================

@router.get("/sessions", response_model=SessionsListResponse)
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's active sessions"""
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_current == True
    ).all()

    return SessionsListResponse(items=sessions, total=len(sessions))


@router.delete("/sessions/{session_id}")
def terminate_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Terminate a specific session"""
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.is_current = False
    session.terminated_at = datetime.utcnow()
    db.add(session)
    db.commit()

    log_activity(
        db, current_user.id, ActivityType.session_terminated,
        f"Session terminated: {session.device_name}", resource_type="session", resource_id=session.id
    )

    return {"success": True, "message": "Session terminated"}


@router.delete("/sessions")
def terminate_all_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Terminate all sessions (logout from all devices)"""
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_current == True
    ).all()

    for session in sessions:
        session.is_current = False
        session.terminated_at = datetime.utcnow()
        db.add(session)

    db.commit()

    log_activity(
        db, current_user.id, ActivityType.logout,
        "Logged out from all devices"
    )

    return {
        "success": True,
        "message": f"Terminated {len(sessions)} session(s)"
    }


# ==================== Activity Log Endpoints ====================

@router.get("/activity", response_model=ActivityLogsListResponse)
def get_activity_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Get user activity logs (paginated)"""
    query = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id)

    total = query.count()
    items = query.order_by(ActivityLog.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return ActivityLogsListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


# ==================== Summary Endpoint ====================

@router.get("", response_model=SettingsSummaryResponse)
def get_settings_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get summary of all user settings"""
    user = get_or_create_user_settings(current_user, db)

    sessions_active = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_current == True
    ).count()

    api_keys_active = db.query(APIKey).filter(
        APIKey.user_id == current_user.id,
        APIKey.is_active == True
    ).count()

    return SettingsSummaryResponse(
        profile=user.profile,
        security=user.security_settings,
        preferences=user.preferences_settings,
        sessions_active=sessions_active,
        api_keys_active=api_keys_active
    )
