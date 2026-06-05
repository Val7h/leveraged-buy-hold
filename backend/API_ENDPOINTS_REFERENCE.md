# Content Moderation System - API Endpoints Reference

## Complete Endpoint List

### 1. PUBLIC ENDPOINTS (Authenticated Users)

#### 1.1 Check Content for Violations
```
GET /api/v1/content/check
```
**Purpose:** Scan text for banned words/violations WITHOUT creating a report

**Query Parameters:**
- `text` (required, string): Content to check (1-5000 chars)

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
```

**Response (200):**
```json
{
  "text_length": 150,
  "flagged": true,
  "reason": "banned_word",
  "severity": "high",
  "detected_words": ["word1", "word2"]
}
```

**Response (401):** Missing/invalid token

---

#### 1.2 Report Content
```
POST /api/v1/content/report
```
**Purpose:** Report inappropriate content for moderator review

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "message_id": "msg_12345",
  "reason": "harassment",
  "description": "Optional description of the issue"
}
```

**Reason Options:**
- `harassment` - Abusive/harassing behavior
- `spam` - Spam content
- `hate` - Hate speech
- `sexual` - Sexual content
- `violence` - Violence
- `misinformation` - False information
- `copyright` - Copyright violation
- `other` - Other

**Response (201):**
```json
{
  "id": 1,
  "message_id": "msg_12345",
  "reporter_id": 5,
  "reason": "harassment",
  "description": "Optional description",
  "status": "open",
  "reviewed_by": null,
  "reviewed_at": null,
  "created_at": "2024-06-05T10:30:00Z"
}
```

**Response (401):** Missing/invalid token
**Response (400):** Invalid reason or message_id

---

#### 1.3 Check Moderation Status
```
GET /api/v1/content/moderation-status/{message_id}
```
**Purpose:** Check if a message was reported/flagged

**Public:** No authentication required

**Response (200):**
```json
{
  "status": "open",
  "reason": "harassment",
  "reviewed_at": null,
  "report_id": 1
}
```

**Status Values:**
- `not_reported` - No reports
- `open` - Reported, awaiting review
- `reviewed` - Reviewed by moderator
- `dismissed` - No violation found
- `deleted` - Content removed

---

### 2. ADMIN ENDPOINTS (Admin-only)

#### 2.1 List All Reports
```
GET /api/v1/content/admin/reports
```
**Purpose:** Get all reports with optional filtering

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**Query Parameters:**
- `status` (optional): `open`, `reviewed`, `dismissed`, `deleted`
- `reason` (optional): Any of the reason types
- `skip` (optional, default: 0): Pagination offset
- `limit` (optional, default: 50, max: 100): Items per page

**Examples:**
```
GET /api/v1/content/admin/reports?status=open
GET /api/v1/content/admin/reports?reason=harassment&skip=0&limit=20
GET /api/v1/content/admin/reports?status=dismissed&reason=spam
```

**Response (200):**
```json
[
  {
    "id": 1,
    "message_id": "msg_12345",
    "reporter_id": 5,
    "reporter_email": "user@example.com",
    "reason": "harassment",
    "description": "This user is harassing me",
    "status": "open",
    "reviewed_by": null,
    "reviewer_email": null,
    "reviewed_at": null,
    "created_at": "2024-06-05T10:30:00Z"
  }
]
```

**Response (403):** Not admin

---

#### 2.2 Get Single Report Details
```
GET /api/v1/content/admin/reports/{report_id}
```
**Purpose:** Get detailed information about one report

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**Response (200):**
```json
{
  "id": 1,
  "message_id": "msg_12345",
  "reporter_id": 5,
  "reporter_email": "user@example.com",
  "reason": "harassment",
  "description": "This user is harassing me",
  "status": "open",
  "reviewed_by": null,
  "reviewer_email": null,
  "reviewed_at": null,
  "created_at": "2024-06-05T10:30:00Z"
}
```

**Response (404):** Report not found
**Response (403):** Not admin

---

#### 2.3 Take Moderation Action
```
PUT /api/v1/content/admin/reports/{report_id}/action
```
**Purpose:** Delete, approve, or warn for a report

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "deleted",
  "reason": "Harassment policy violation - continued abusive behavior"
}
```

**Action Options:**
- `delete` - Remove content
- `approve` - Approve (no action needed)
- `warn` - Warn user

**Validation:**
- `reason` must be 10-500 characters
- `action` must be valid option

**Response (200):**
```json
{
  "success": true,
  "message": "Action 'deleted' processed successfully",
  "log_id": 42
}
```

**Response (404):** Report not found
**Response (403):** Not admin
**Response (422):** Invalid action or reason too short

---

#### 2.4 Dismiss Report
```
PUT /api/v1/content/admin/reports/{report_id}/dismiss
```
**Purpose:** Dismiss report (content is OK, no violation)

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**Query Parameters:**
- `reason` (required): Why this report is dismissed (10-500 chars)

**Example:**
```
PUT /api/v1/content/admin/reports/1/dismiss?reason=Content+review+determined+no+violation
```

**Response (200):**
```json
{
  "success": true,
  "message": "Report dismissed"
}
```

**Response (404):** Report not found
**Response (403):** Not admin
**Response (422):** Reason too short or long

---

#### 2.5 List Moderation Logs
```
GET /api/v1/content/admin/logs
```
**Purpose:** View audit trail of all moderation actions

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**Query Parameters:**
- `message_id` (optional): Filter by message
- `skip` (optional, default: 0): Pagination
- `limit` (optional, default: 50, max: 100): Items per page

**Examples:**
```
GET /api/v1/content/admin/logs
GET /api/v1/content/admin/logs?message_id=msg_12345
GET /api/v1/content/admin/logs?skip=50&limit=25
```

**Response (200):**
```json
[
  {
    "id": 42,
    "message_id": "msg_12345",
    "action": "deleted",
    "moderator_id": 1,
    "moderator_email": "admin@example.com",
    "reason": "Harassment violation",
    "created_at": "2024-06-05T11:00:00Z"
  }
]
```

**Response (403):** Not admin

---

#### 2.6 Get Statistics
```
GET /api/v1/content/admin/statistics
```
**Purpose:** Get moderation statistics and analytics

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**Response (200):**
```json
{
  "total_reports": 150,
  "open_reports": 15,
  "reviewed_reports": 100,
  "dismissed_reports": 30,
  "deleted_reports": 5,
  "reports_by_reason": {
    "harassment": 50,
    "spam": 40,
    "hate": 30,
    "sexual": 20,
    "violence": 10
  },
  "reports_by_status": {
    "open": 15,
    "reviewed": 100,
    "dismissed": 30,
    "deleted": 5
  }
}
```

**Response (403):** Not admin

---

#### 2.7 Get Open Reports Count
```
GET /api/v1/content/admin/open-reports-count
```
**Purpose:** Quick count of pending reports (for dashboard)

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**Response (200):**
```json
{
  "open_count": 15
}
```

**Response (403):** Not admin

---

#### 2.8 Admin Dashboard UI
```
GET /api/v1/admin/moderation/dashboard
```
**Purpose:** Interactive HTML dashboard for moderation

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**Response (200):** HTML page with:
- Real-time statistics
- Filterable reports table
- Action buttons (Delete, Warn, Dismiss)
- Modal dialogs
- Moderation logs
- Auto-refresh every 30s

**Response (403):** Not admin (redirects to login)

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Reason must be between 10 and 500 characters"
}
```

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "Admin access required"
}
```

### 404 Not Found
```json
{
  "detail": "Report not found"
}
```

### 422 Unprocessable Entity
```json
{
  "detail": [
    {
      "loc": ["body", "action"],
      "msg": "value is not a valid enumeration member",
      "type": "type_error.enum"
    }
  ]
}
```

---

## Authentication

All endpoints require JWT token in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting a Token

```bash
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=email@example.com&password=yourpassword

# Response
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

---

## Rate Limiting

Currently not enforced, but recommended for production:
- Report endpoint: 5/minute per user
- Check endpoint: 10/minute per user
- Admin endpoints: 100/minute per user

---

## Pagination

Most list endpoints support pagination:
- `skip`: How many to skip (default: 0)
- `limit`: How many to return (default: 50, max: 100)

**Example:**
```
GET /api/v1/content/admin/reports?skip=50&limit=25
```

---

## Filtering

List endpoints support multiple filters:

```
GET /api/v1/content/admin/reports?status=open&reason=harassment
```

Filters can be combined.

---

## Testing with cURL

### Check content
```bash
curl "http://localhost:8000/api/v1/content/check?text=hello" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Report content
```bash
curl -X POST "http://localhost:8000/api/v1/content/report" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message_id": "msg_123",
    "reason": "harassment",
    "description": "User is harassing"
  }'
```

### Admin - List reports
```bash
curl "http://localhost:8000/api/v1/content/admin/reports?status=open" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Admin - Take action
```bash
curl -X PUT "http://localhost:8000/api/v1/content/admin/reports/1/action" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "delete",
    "reason": "Harassment policy violation"
  }'
```

---

## Testing with Python

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"
TOKEN = "your_jwt_token"
ADMIN_TOKEN = "admin_jwt_token"

# Check content
response = requests.get(
    f"{BASE_URL}/content/check",
    params={"text": "spam viagra"},
    headers={"Authorization": f"Bearer {TOKEN}"}
)
print(response.json())

# Report content
response = requests.post(
    f"{BASE_URL}/content/report",
    json={
        "message_id": "msg_123",
        "reason": "harassment",
        "description": "Abusing user"
    },
    headers={"Authorization": f"Bearer {TOKEN}"}
)
print(response.json())

# Admin - List reports
response = requests.get(
    f"{BASE_URL}/content/admin/reports",
    params={"status": "open"},
    headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
)
print(response.json())
```

---

## OpenAPI Documentation

Full API documentation available at:
```
http://localhost:8000/api/docs
http://localhost:8000/api/redoc
```

Interactive testing available in Swagger UI at `/api/docs`

---

*Complete API Reference - Content Moderation System v1.0.0*
*Generated: 2024-06-05*
