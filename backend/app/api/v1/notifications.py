"""Notification endpoints — in-app + push subscriptions"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user_or_demo as get_current_user
from app.models.user import User
from app.models.notification import Notification, NotificationType, PushSubscription

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ── Schemas ────────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    body: str
    url: Optional[str] = None
    read: bool
    created_at: datetime

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


# ── Internal helper (used by other modules to create notifications) ────────

def create_notification(
    db: Session,
    user_id: int,
    type: NotificationType,
    title: str,
    body: str,
    url: Optional[str] = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        url=url,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n
