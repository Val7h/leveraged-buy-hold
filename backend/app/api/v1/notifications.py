"""Notification endpoints — in-app + push subscriptions + queue management"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user_or_demo as get_current_user
from app.models.user import User
from app.models.notification import Notification, NotificationType, NotificationStatus, PushSubscription
from app.models.user_settings import PreferencesSettings, EmailFrequency

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ── Schemas ────────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    body: str
    url: Optional[str] = None
    read: bool
    status: str
    created_at: datetime
    delivered_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationQueueIn(BaseModel):
    """Request to queue a notification for batch delivery"""
    type: NotificationType
    title: str
    body: str
    url: Optional[str] = None
    send_immediate: bool = False  # Override queue, send immediately
    batch_id: Optional[str] = None  # Optional batch grouping


class NotificationDigestOut(BaseModel):
    """Digest response with grouped notifications"""
    date: datetime
    count: int
    by_type: dict  # {"price_alert": 5, "news": 3, ...}
    notifications: List[NotificationOut]

    class Config:
        from_attributes = True


class PushSubscriptionIn(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


class MarkReadIn(BaseModel):
    ids: Optional[List[int]] = None   # None = mark ALL


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("", response_model=List[NotificationOut])
def list_notifications(
    limit: int = 30,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the most recent notifications for the authenticated user."""
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.read == False)
    return q.order_by(desc(Notification.created_at)).limit(limit).all()


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,
    ).count()
    return {"count": count}


@router.post("/mark-read")
def mark_read(
    payload: MarkReadIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark specific (or all) notifications as read."""
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if payload.ids:
        q = q.filter(Notification.id.in_(payload.ids))
    q.update({"read": True}, synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(n)
    db.commit()
    return {"ok": True}


# ── Push subscriptions ─────────────────────────────────────────────────────

@router.post("/push/subscribe")
def subscribe_push(
    payload: PushSubscriptionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a Web Push subscription for the user's browser."""
    existing = db.query(PushSubscription).filter(
        PushSubscription.endpoint == payload.endpoint
    ).first()
    if existing:
        # Update keys in case they rotated
        existing.p256dh = payload.p256dh
        existing.auth = payload.auth
        db.commit()
        return {"ok": True, "action": "updated"}

    sub = PushSubscription(
        user_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh=payload.p256dh,
        auth=payload.auth,
    )
    db.add(sub)
    db.commit()
    return {"ok": True, "action": "created"}


@router.delete("/push/unsubscribe")
def unsubscribe_push(
    payload: PushSubscriptionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(PushSubscription).filter(
        PushSubscription.endpoint == payload.endpoint,
        PushSubscription.user_id == current_user.id,
    ).delete()
    db.commit()
    return {"ok": True}


# ── Queue Management ──────────────────────────────────────────────────────

@router.post("/queue", response_model=NotificationOut)
def queue_notification(
    payload: NotificationQueueIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Queue a notification for batch delivery or send immediately.

    - If send_immediate=True, notification is sent immediately (status=sent)
    - Otherwise, queued notification will be batched and sent based on user's
      email_frequency preference (immediate/daily/weekly)
    """
    # Get user preferences to determine send behavior
    prefs = db.query(PreferencesSettings).filter(
        PreferencesSettings.user_id == current_user.id
    ).first()

    # Determine initial status
    if payload.send_immediate or (prefs and prefs.email_frequency == EmailFrequency.immediate):
        status = NotificationStatus.sent
        delivered_at = datetime.utcnow()
    else:
        status = NotificationStatus.queued
        delivered_at = None

    n = Notification(
        user_id=current_user.id,
        type=payload.type,
        title=payload.title,
        body=payload.body,
        url=payload.url,
        status=status,
        delivered_at=delivered_at,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


@router.get("/digest", response_model=NotificationDigestOut)
def get_notification_digest(
    days: int = Query(1, ge=1, le=30, description="Number of days to include in digest"),
    notification_type: Optional[NotificationType] = Query(None, description="Filter by type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a digest of notifications from the past N days.
    Useful for daily/weekly digest emails.

    Returns notifications grouped by type with aggregated stats.
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Build query
    q = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.created_at >= cutoff_date,
    )

    if notification_type:
        q = q.filter(Notification.type == notification_type)

    notifications = q.order_by(desc(Notification.created_at)).all()

    # Group by type
    by_type = {}
    for notif in notifications:
        type_str = notif.type.value
        by_type[type_str] = by_type.get(type_str, 0) + 1

    return NotificationDigestOut(
        date=datetime.utcnow(),
        count=len(notifications),
        by_type=by_type,
        notifications=notifications,
    )


# ── Preferences (Email Frequency) ─────────────────────────────────────────

@router.put("/preferences/email-frequency")
def update_email_frequency(
    frequency: EmailFrequency = Query(..., description="Email frequency: immediate, daily, weekly, or never"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update user's email notification frequency preference.

    - immediate: Send email notifications immediately
    - daily: Group notifications into daily digest emails
    - weekly: Group notifications into weekly digest emails
    - never: Disable email notifications entirely
    """
    prefs = db.query(PreferencesSettings).filter(
        PreferencesSettings.user_id == current_user.id
    ).first()

    if not prefs:
        # Create if doesn't exist
        prefs = PreferencesSettings(user_id=current_user.id)
        db.add(prefs)

    prefs.email_frequency = frequency
    prefs.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prefs)

    return {
        "success": True,
        "email_frequency": frequency.value,
        "message": f"Email frequency set to {frequency.value}"
    }


# ── Internal helper (used by other modules to create notifications) ────────

def create_notification(
    db: Session,
    user_id: int,
    type: NotificationType,
    title: str,
    body: str,
    url: Optional[str] = None,
    send_immediately: bool = True,
) -> Notification:
    """
    Create a notification for a user.

    Args:
        db: Database session
        user_id: Target user ID
        type: NotificationType enum
        title: Notification title
        body: Notification body/message
        url: Optional deep link
        send_immediately: If True, send immediately (default). If False, queue based on preferences.
    """
    # Determine status based on send_immediately flag
    if send_immediately:
        status = NotificationStatus.sent
        delivered_at = datetime.utcnow()
    else:
        status = NotificationStatus.queued
        delivered_at = None

    n = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        url=url,
        status=status,
        delivered_at=delivered_at,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n
