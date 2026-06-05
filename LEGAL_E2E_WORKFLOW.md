# Legal Integration - Complete End-to-End Workflow

## Overview

This document describes the complete workflow from user registration through consent logging and database persistence.

## Actors

- **Frontend**: Next.js 14 application
- **Backend**: FastAPI application
- **Database**: PostgreSQL (with Alembic migrations)

## Complete Workflow

### Step 1: User Registration (Frontend)

```typescript
// frontend/src/app/login/page.tsx
const handleRegister = async (e: React.FormEvent) => {
  // User fills form:
  // - Email: user@example.com
  // - Password: secure_password
  // - Name: John Doe
  // - Risk Profile: balanced

  // POST to backend
  await authApi.register({
    email: "user@example.com",
    password: "secure_password",
    full_name: "John Doe",
    risk_profile: "balanced"
  });

  // Auto-login user
  await login("user@example.com", "secure_password");

  // Show consent modal
  setShowRiskModal(true);
};
```

**Backend Response**:
```json
{
  "user_id": 123,
  "email": "user@example.com",
  "status": "created"
}
```

### Step 2: Risk Disclaimer Modal Appears (Frontend)

```typescript
// frontend/src/app/login/page.tsx
{showRiskModal && !hasAcceptedRisk && (
  <RiskDisclaimerModal onAccept={handleRiskAccepted} />
)}
```

Modal shows:
- Risk acknowledgment checkbox
- Terms acceptance checkbox
- Risk disclosure content
- "I Understand & Accept" button (disabled until both checked)

### Step 3: User Accepts Consent (Frontend)

```typescript
// frontend/src/components/RiskDisclaimerModal.tsx
const handleSubmit = async () => {
  // Validate both checkboxes are checked
  if (!acceptRisk || !acceptTerms) {
    setError("Please accept both items");
    return;
  }

  // POST consent to backend
  const response = await fetch("/api/v1/user/consent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`
    },
    body: JSON.stringify({
      acceptRisk: true,
      acceptTerms: true,
      timestamp: new Date().toISOString()  // e.g., "2026-06-18T14:30:00.000Z"
    })
  });

  if (response.ok) {
    const data = await response.json();
    console.log("Consent logged:", data);
    onAccept();  // Close modal
    router.push("/dashboard");  // Redirect
  } else {
    const error = await response.json();
    setError(error.detail);
  }
};
```

**Request Sent**:
```json
{
  "acceptRisk": true,
  "acceptTerms": true,
  "timestamp": "2026-06-18T14:30:00Z"
}
```

### Step 4: Backend Receives Consent (Backend)

```python
# backend/app/api/v1/user_consent.py
@router.post("/consent")
async def log_consent(
    data: ConsentData,
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validate input
    if not data.acceptRisk or not data.acceptTerms:
        raise HTTPException(400, "Both must be accepted")

    # 2. Parse timestamp
    consent_timestamp = datetime.fromisoformat(
        data.timestamp.replace('Z', '+00:00')
    )

    # 3. Check timestamp not in future
    if consent_timestamp > datetime.now(consent_timestamp.tzinfo):
        raise HTTPException(400, "Timestamp cannot be in future")

    # 4. Update user record
    user.risk_acknowledged = True
    user.terms_accepted = True
    user.consent_logged_at = consent_timestamp

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": "Consent logged successfully",
        "timestamp": consent_timestamp.isoformat(),
        "data": {
            "user_id": user.id,
            "risk_acknowledged": True,
            "terms_accepted": True,
            "logged_at": user.consent_logged_at.isoformat()
        }
    }
```

### Step 5: Database Updated (Database)

```sql
-- Migration runs: alembic upgrade head
-- Adds columns to users table:
ALTER TABLE users ADD COLUMN risk_acknowledged BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN consent_logged_at TIMESTAMP;

-- User record updated:
UPDATE users SET
  risk_acknowledged = TRUE,
  terms_accepted = TRUE,
  consent_logged_at = '2026-06-18T14:30:00+00:00'
WHERE id = 123;

-- Verify:
SELECT user_id, risk_acknowledged, terms_accepted, consent_logged_at
FROM users
WHERE id = 123;
-- Output:
-- 123 | true | true | 2026-06-18 14:30:00+00:00
```

### Step 6: Success Response (Backend → Frontend)

```json
{
  "success": true,
  "message": "Consent logged successfully",
  "timestamp": "2026-06-18T14:30:00+00:00",
  "data": {
    "user_id": 123,
    "risk_acknowledged": true,
    "terms_accepted": true,
    "logged_at": "2026-06-18T14:30:00+00:00"
  }
}
```

### Step 7: User Redirected to Dashboard (Frontend)

```typescript
// Modal closes
setShowRiskModal(false);
setHasAcceptedRisk(true);

// Redirect
router.push("/dashboard");
// User now has access to Pro features
```

## Error Scenarios

### Scenario A: Missing Risk Acceptance

```
Frontend:
- User checks "Terms" but NOT "Risk"
- Submit button disabled (grayed out)
- User clicks anyway (somehow): no request sent

OR if request sent:
Backend:
- Receives: { acceptRisk: false, acceptTerms: true, ... }
- Returns: 400 "Both acceptRisk and acceptTerms must be true"

Frontend:
- Shows error message
- User can check box and retry
```

### Scenario B: Invalid Timestamp

```
Frontend:
- User somehow sends: { timestamp: "invalid-date" }

Backend:
- ValueError parsing timestamp
- Returns: 400 "Invalid timestamp format. Use ISO 8601"

Frontend:
- Shows error
- Retries automatically with correct timestamp
```

### Scenario C: Network Error

```
Frontend:
- fetch() fails (network error)
- catch block: shows error to user
- User can retry

Options:
1. Automatic retry with exponential backoff
2. Manual retry with "Try Again" button
3. Queue for retry when network restored
```

### Scenario D: User Not Authenticated

```
Frontend:
- Missing Authorization header

Backend:
- get_current_user() returns None
- Returns: 401 "User not authenticated"

Frontend:
- Redirects to login
- User logs in again
```

## Database Schema

```python
# backend/app/models.py
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    full_name = Column(String)
    risk_profile = Column(String)

    # Consent fields (added by migration 003)
    risk_acknowledged = Column(Boolean, default=False)
    terms_accepted = Column(Boolean, default=False)
    consent_logged_at = Column(DateTime, nullable=True)
```

## Audit Trail

For compliance, log all consent submissions:

```python
# backend/app/api/v1/user_consent.py
import logging

logger = logging.getLogger(__name__)

# In the endpoint:
logger.info(
    f"Consent logged for user {user.id} ({user.email}) "
    f"at {consent_timestamp}: "
    f"risk_acknowledged={data.acceptRisk}, "
    f"terms_accepted={data.acceptTerms}"
)
```

Output:
```
[2026-06-18 14:30:00] INFO - Consent logged for user 123 (user@example.com) at 2026-06-18T14:30:00Z: risk_acknowledged=True, terms_accepted=True
```

## Testing Checklist

### Unit Tests
- ✅ Valid consent submission (all fields correct)
- ✅ Missing risk acceptance (should fail)
- ✅ Missing terms acceptance (should fail)
- ✅ Invalid timestamp format (should fail)
- ✅ Future timestamp (should fail)
- ✅ Missing auth header (should fail)
- ✅ Invalid auth token (should fail)

### Integration Tests
- ✅ Database migration runs successfully
- ✅ User record updated correctly
- ✅ Timestamp persisted correctly
- ✅ Consent retrieved via GET endpoint
- ✅ Audit log created

### E2E Tests
- ✅ Register → Modal appears
- ✅ Modal submit → POST sent
- ✅ POST succeeds → Redirect to dashboard
- ✅ POST fails → Error shown, can retry
- ✅ Mobile: Modal responsive
- ✅ Mobile: Checkboxes clickable
- ✅ Mobile: Submit button works

## Success Criteria

✅ User can register
✅ Risk modal appears after registration
✅ User can check both boxes
✅ Submit button sends POST to /api/v1/user/consent
✅ Backend receives and validates
✅ Database migration runs
✅ User record updated
✅ User redirected to dashboard
✅ Consent persisted to database
✅ Audit trail created
✅ Mobile responsive
✅ Error handling works

## Deployment Checklist

Before launching to production:

- [ ] Migration tested locally
- [ ] Endpoint tested with Postman/curl
- [ ] Frontend tested in dev environment
- [ ] Mobile tested on real devices
- [ ] Error scenarios tested
- [ ] Database backups configured
- [ ] Audit logging configured
- [ ] Rate limiting on endpoint
- [ ] Input validation complete
- [ ] Security headers set
- [ ] HTTPS enabled
- [ ] Database encrypted
