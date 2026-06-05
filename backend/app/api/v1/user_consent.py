"""User consent logging endpoints"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

router = APIRouter(prefix="/user", tags=["user"])

@router.post("/consent")
async def log_consent(data: dict, user = Depends(get_current_user)):
    """Log user risk acknowledgment and terms acceptance"""
    try:
        user.risk_acknowledged = data.get("acceptRisk", False)
        user.terms_accepted = data.get("acceptTerms", False)
        user.consent_logged_at = datetime.fromisoformat(data.get("timestamp"))
        
        db.add(user)
        db.commit()
        
        return {"success": True, "message": "Consent logged successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
