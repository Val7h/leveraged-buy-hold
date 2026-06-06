"""User consent logging endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_or_demo as get_current_user
from app.models.user import User

router = APIRouter(prefix="/user", tags=["user"])


class ConsentData(BaseModel):
    acceptRisk: bool = Field(..., description="User acknowledges investment risk")
    acceptTerms: bool = Field(..., description="User accepts terms and conditions")
    timestamp: str = Field(..., description="ISO 8601 timestamp of consent")


class ConsentResponse(BaseModel):
    success: bool
    message: str
    timestamp: str
    data: dict


@router.post("/consent", response_model=ConsentResponse, status_code=status.HTTP_200_OK)
async def log_consent(
    data: ConsentData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log user risk acknowledgment and terms acceptance"""

    if not data.acceptRisk or not data.acceptTerms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both acceptRisk and acceptTerms must be true to proceed"
        )

    try:
        timestamp_str = data.timestamp.replace('Z', '+00:00')
        consent_timestamp = datetime.fromisoformat(timestamp_str)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid timestamp format. Use ISO 8601 (e.g. 2026-06-18T14:30:00Z)"
        )

    if consent_timestamp > datetime.now(consent_timestamp.tzinfo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent timestamp cannot be in the future"
        )

    try:
        current_user.risk_acknowledged = data.acceptRisk
        current_user.terms_accepted = data.acceptTerms
        current_user.consent_logged_at = consent_timestamp
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

    return ConsentResponse(
        success=True,
        message="Consent logged successfully",
        timestamp=consent_timestamp.isoformat(),
        data={
            "user_id": current_user.id,
            "email": current_user.email,
            "risk_acknowledged": current_user.risk_acknowledged,
            "terms_accepted": current_user.terms_accepted,
            "logged_at": current_user.consent_logged_at.isoformat(),
        }
    )


@router.get("/consent", response_model=ConsentResponse, status_code=status.HTTP_200_OK)
async def get_consent_status(
    current_user: User = Depends(get_current_user),
):
    """Get current user's consent status"""

    return ConsentResponse(
        success=True,
        message="Consent status retrieved",
        timestamp=current_user.consent_logged_at.isoformat() if current_user.consent_logged_at else "",
        data={
            "user_id": current_user.id,
            "email": current_user.email,
            "risk_acknowledged": current_user.risk_acknowledged,
            "terms_accepted": current_user.terms_accepted,
            "logged_at": current_user.consent_logged_at.isoformat() if current_user.consent_logged_at else None,
            "has_consented": current_user.risk_acknowledged and current_user.terms_accepted,
        }
    )

