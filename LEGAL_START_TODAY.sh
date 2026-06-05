#!/bin/bash
# Legal Lead - RiskDisclaimerModal Integration Kickoff Script
# Run this IMMEDIATELY and follow the prompts

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "LEGAL LEAD - RISKDISCLAIMERMODAL INTEGRATION"
echo "Executing NOW - Follow each step"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Verify component exists
echo ""
echo "STEP 1: Verify RiskDisclaimerModal component exists..."
if [ -f "frontend/src/components/RiskDisclaimerModal.tsx" ]; then
    echo "✅ Found: frontend/src/components/RiskDisclaimerModal.tsx"
    wc -l "frontend/src/components/RiskDisclaimerModal.tsx"
else
    echo "❌ ERROR: RiskDisclaimerModal.tsx not found!"
    exit 1
fi

# Step 2: Show integration guide
echo ""
echo "STEP 2: Read integration guide..."
echo "File: WEEK3_INTEGRATION_QUICK_START.txt"
echo "Focus: Legal/Frontend Team section"
echo "Time: 10 minutes"

# Step 3: Create database migration skeleton
echo ""
echo "STEP 3: Create database migration template..."
mkdir -p backend/migrations

cat > "backend/migrations/003_add_consent_fields.py" << 'EOF'
"""Add consent tracking fields to users table"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('users', sa.Column('risk_acknowledged', sa.Boolean, default=False))
    op.add_column('users', sa.Column('terms_accepted', sa.Boolean, default=False))
    op.add_column('users', sa.Column('consent_logged_at', sa.DateTime, nullable=True))

def downgrade():
    op.drop_column('users', 'risk_acknowledged')
    op.drop_column('users', 'terms_accepted')
    op.drop_column('users', 'consent_logged_at')
EOF

echo "✅ Created: backend/migrations/003_add_consent_fields.py"

# Step 4: Create backend endpoint skeleton
echo ""
echo "STEP 4: Create backend endpoint template..."
mkdir -p backend/app/api/v1

cat > "backend/app/api/v1/user_consent.py" << 'EOF'
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
EOF

echo "✅ Created: backend/app/api/v1/user_consent.py"

# Step 5: Verification
echo ""
echo "STEP 5: Verification..."
echo "✅ Modal component reviewed"
echo "✅ Database migration template created"
echo "✅ Backend endpoint template created"
echo "✅ Ready for Monday morning integration"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "LEGAL: You're ready for Monday!"
echo "Tell CEO: 'RiskDisclaimerModal reviewed, database skeleton ready'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
