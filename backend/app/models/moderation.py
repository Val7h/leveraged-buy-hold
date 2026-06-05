from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class ReportStatus(str, enum.Enum):
    open = "open"
    reviewed = "reviewed"
    dismissed = "dismissed"
    deleted = "deleted"


class ReportReason(str, enum.Enum):
    harassment = "harassment"
    spam = "spam"
    hate = "hate"
    sexual = "sexual"
    violence = "violence"
    misinformation = "misinformation"
    copyright = "copyright"
    other = "other"


class ModerationAction(str, enum.Enum):
    deleted = "deleted"
    flagged = "flagged"
    approved = "approved"
    warned_user = "warned_user"


class ContentReport(Base):
    __tablename__ = "content_reports"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String, nullable=False, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Enum(ReportReason, native_enum=False), nullable=False)
    description = Column(Text)
    status = Column(Enum(ReportStatus, native_enum=False), default=ReportStatus.open)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    reporter = relationship("User", foreign_keys=[reporter_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class ContentModerationLog(Base):
    __tablename__ = "content_moderation_logs"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String, nullable=False, index=True)
    action = Column(Enum(ModerationAction, native_enum=False), nullable=False)
    moderator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(Text)
    report_id = Column(Integer, ForeignKey("content_reports.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    moderator = relationship("User")
    report = relationship("ContentReport")
