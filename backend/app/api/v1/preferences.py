"""
User Preferences API endpoints — specialized endpoints for managing notification preferences
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.user_settings import PreferencesSettings, EmailFrequency
from app.schemas.settings import PreferencesResponse

router = APIRouter(prefix="/preferences", tags=["preferences"])


def get_or_create_preferences(user: User, db: Session) -> PreferencesSettings:
    """Get or create user preferences settings"""
    prefs = db.query(PreferencesSettings).filter(
        PreferencesSettings.user_id == user.id
    ).first()

    if not prefs:
        prefs = PreferencesSettings(user_id=user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    return prefs


@router.get("/email-frequency")
def get_email_frequency(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get user's current email notification frequency preference.

    Returns:
    - immediate: Send email notifications immediately
    - daily: Group notifications into daily digest emails
    - weekly: Group notifications into weekly digest emails
    - never: Disable email notifications entirely
    """
    prefs = get_or_create_preferences(current_user, db)

    return {
        "email_frequency": prefs.email_frequency.value,
        "email_alerts": prefs.email_alerts,
        "daily_digest_time": prefs.daily_digest_time,
    }


@router.put("/email-frequency")
def update_email_frequency(
    frequency: EmailFrequency = Query(..., description="Email frequency: immediate, daily, weekly, or never"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update user's email notification frequency preference.

    - **immediate**: Send email notifications immediately
    - **daily**: Group notifications into daily digest emails (sent at daily_digest_time)
    - **weekly**: Group notifications into weekly digest emails (Mondays)
    - **never**: Disable email notifications entirely

    This setting controls how frequently the user receives email digests of their notifications.
    """
    prefs = get_or_create_preferences(current_user, db)

    prefs.email_frequency = frequency
    prefs.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prefs)

    return {
        "success": True,
        "email_frequency": frequency.value,
        "message": f"Email notification frequency set to {frequency.value}",
        "updated_at": prefs.updated_at.isoformat(),
    }


@router.put("/daily-digest-time")
def update_daily_digest_time(
    time: str = Query(..., regex=r"^\d{2}:\d{2}$", description="Time in HH:MM format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update the preferred time for daily digest emails (HH:MM format).

    Example: "09:00" for 9 AM, "21:30" for 9:30 PM
    """
    prefs = get_or_create_preferences(current_user, db)

    prefs.daily_digest_time = time
    prefs.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prefs)

    return {
        "success": True,
        "daily_digest_time": time,
        "message": f"Daily digest time set to {time}",
        "updated_at": prefs.updated_at.isoformat(),
    }


@router.get("", response_model=PreferencesResponse)
def get_all_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all user preferences"""
    prefs = get_or_create_preferences(current_user, db)
    return prefs


@router.put("", response_model=PreferencesResponse)
def update_all_preferences(
    email_alerts: bool = Query(None),
    push_notifications: bool = Query(None),
    sms_alerts: bool = Query(None),
    marketing_emails: bool = Query(None),
    email_frequency: EmailFrequency = Query(None),
    price_alerts: bool = Query(None),
    milestone_alerts: bool = Query(None),
    allow_analytics: bool = Query(None),
    allow_improvements: bool = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update multiple user preferences at once"""
    prefs = get_or_create_preferences(current_user, db)

    if email_alerts is not None:
        prefs.email_alerts = email_alerts
    if push_notifications is not None:
        prefs.push_notifications = push_notifications
    if sms_alerts is not None:
        prefs.sms_alerts = sms_alerts
    if marketing_emails is not None:
        prefs.marketing_emails = marketing_emails
    if email_frequency is not None:
        prefs.email_frequency = email_frequency
    if price_alerts is not None:
        prefs.price_alerts = price_alerts
    if milestone_alerts is not None:
        prefs.milestone_alerts = milestone_alerts
    if allow_analytics is not None:
        prefs.allow_analytics = allow_analytics
    if allow_improvements is not None:
        prefs.allow_improvements = allow_improvements

    prefs.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prefs)

    return prefs
