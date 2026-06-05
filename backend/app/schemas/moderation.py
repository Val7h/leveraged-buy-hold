from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ReportReason(str, Enum):
    harassment = "harassment"
    spam = "spam"
    hate = "hate"
    sexual = "sexual"
    violence = "violence"
    misinformation = "misinformation"
    copyright = "copyright"
    other = "other"


class ReportStatus(str, Enum):
    open = "open"
    reviewed = "reviewed"
    dismissed = "dismissed"
    deleted = "deleted"


class ModerationAction(str, Enum):
    delete = "deleted"
    approve = "approved"
    warn = "warned_user"


class ContentReportCreate(BaseModel):
    message_id: str
    reason: ReportReason
    description: Optional[str] = None


class ContentReportResponse(BaseModel):
    id: int
    message_id: str
    reporter_id: int
    reason: str
    description: Optional[str]
    status: str
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ContentReportDetailResponse(BaseModel):
    id: int
    message_id: str
    reporter_id: int
    reporter_email: str
    reason: str
    description: Optional[str]
    status: str
    reviewed_by: Optional[int]
    reviewer_email: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ModerationActionRequest(BaseModel):
    action: ModerationAction = Field(..., description="delete, approve, or warn")
    reason: str = Field(..., min_length=10, max_length=500)


class ModerationLogResponse(BaseModel):
    id: int
    message_id: str
    action: str
    moderator_id: int
    moderator_email: str
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ModerationStatsResponse(BaseModel):
    total_reports: int
    open_reports: int
    reviewed_reports: int
    dismissed_reports: int
    deleted_reports: int
    reports_by_reason: dict
    reports_by_status: dict


class BannedWordResponse(BaseModel):
    id: int
    word: str
    severity: str
    created_at: datetime

    class Config:
        from_attributes = True
