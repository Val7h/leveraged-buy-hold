from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.moderation import (
    ContentReport,
    ContentModerationLog,
    ReportStatus,
    ReportReason,
    ModerationAction,
)
from app.models.user import User
from datetime import datetime
from typing import List, Dict, Optional


# Expandable list of banned words with severity levels
BANNED_WORDS = {
    "spam": {"severity": "low", "words": ["viagra", "casino", "lottery", "win_now"]},
    "harassment": {
        "severity": "high",
        "words": ["kill_yourself", "go_die", "deserve_death"],
    },
    "hate": {
        "severity": "high",
        "words": ["slur1", "slur2", "slur3"],  # Placeholder - add actual words
    },
    "sexual": {
        "severity": "high",
        "words": ["explicit_term1", "explicit_term2"],  # Placeholder
    },
}


def check_content_for_violations(text: str) -> Dict:
    """
    Check content for banned words or patterns.
    Returns: { 'flagged': bool, 'reason': str, 'severity': str, 'detected_words': [str] }
    """
    if not text or not isinstance(text, str):
        return {"flagged": False, "reason": None, "severity": None, "detected_words": []}

    text_lower = text.lower()
    detected_words = []
    max_severity = None

    for reason, data in BANNED_WORDS.items():
        for word in data["words"]:
            # Simple word boundary check - can be improved with regex
            if word.lower() in text_lower:
                detected_words.append(word)
                severity = data["severity"]

                # Update max severity (high > medium > low)
                if max_severity is None or severity == "high":
                    max_severity = severity
                elif max_severity == "medium" and severity == "low":
                    pass
                else:
                    max_severity = severity

    if detected_words:
        return {
            "flagged": True,
            "reason": "banned_word",
            "severity": max_severity,
            "detected_words": list(set(detected_words)),
        }

    return {"flagged": False, "reason": None, "severity": None, "detected_words": []}


def create_content_report(
    db: Session, message_id: str, reporter_id: int, reason: str, description: Optional[str] = None
) -> ContentReport:
    """Create a new content report."""
    report = ContentReport(
        message_id=message_id,
        reporter_id=reporter_id,
        reason=reason,
        description=description,
        status=ReportStatus.open,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def get_open_reports(db: Session, skip: int = 0, limit: int = 50) -> List[ContentReport]:
    """Get all open reports with pagination."""
    return (
        db.query(ContentReport)
        .filter(ContentReport.status == ReportStatus.open)
        .order_by(ContentReport.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_all_reports(
    db: Session,
    status: Optional[str] = None,
    reason: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[ContentReport]:
    """Get reports with optional filtering."""
    query = db.query(ContentReport)

    if status:
        query = query.filter(ContentReport.status == status)
    if reason:
        query = query.filter(ContentReport.reason == reason)

    return query.order_by(ContentReport.created_at.desc()).offset(skip).limit(limit).all()


def get_report_detail(db: Session, report_id: int) -> Optional[ContentReport]:
    """Get detailed report information."""
    return db.query(ContentReport).filter(ContentReport.id == report_id).first()


def process_report_action(
    db: Session,
    report_id: int,
    action: str,
    moderator_id: int,
    reason: str,
) -> Dict:
    """
    Process a report action (delete, approve, warn).
    Returns: {'success': bool, 'message': str, 'log_id': int}
    """
    report = db.query(ContentReport).filter(ContentReport.id == report_id).first()
    if not report:
        return {"success": False, "message": "Report not found", "log_id": None}

    # Update report status
    if action == "deleted":
        report.status = ReportStatus.deleted
    elif action == "approved":
        report.status = ReportStatus.reviewed
    elif action == "warned_user":
        report.status = ReportStatus.reviewed
    else:
        return {"success": False, "message": f"Invalid action: {action}", "log_id": None}

    report.reviewed_by = moderator_id
    report.reviewed_at = datetime.utcnow()

    # Create moderation log
    log = ContentModerationLog(
        message_id=report.message_id,
        action=action,
        moderator_id=moderator_id,
        reason=reason,
        report_id=report.id,
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "success": True,
        "message": f"Action '{action}' processed successfully",
        "log_id": log.id,
    }


def dismiss_report(
    db: Session, report_id: int, moderator_id: int, reason: str
) -> Dict:
    """Dismiss a report."""
    report = db.query(ContentReport).filter(ContentReport.id == report_id).first()
    if not report:
        return {"success": False, "message": "Report not found"}

    report.status = ReportStatus.dismissed
    report.reviewed_by = moderator_id
    report.reviewed_at = datetime.utcnow()

    log = ContentModerationLog(
        message_id=report.message_id,
        action="approved",  # Dismissed = approved (content OK)
        moderator_id=moderator_id,
        reason=reason,
        report_id=report.id,
    )

    db.add(log)
    db.commit()

    return {"success": True, "message": "Report dismissed"}


def get_moderation_logs(
    db: Session, message_id: Optional[str] = None, skip: int = 0, limit: int = 50
) -> List[ContentModerationLog]:
    """Get moderation logs."""
    query = db.query(ContentModerationLog)
    if message_id:
        query = query.filter(ContentModerationLog.message_id == message_id)
    return query.order_by(ContentModerationLog.created_at.desc()).offset(skip).limit(limit).all()


def get_moderation_status(db: Session, message_id: str) -> Dict:
    """Get moderation status for a specific message."""
    report = (
        db.query(ContentReport)
        .filter(ContentReport.message_id == message_id)
        .order_by(ContentReport.created_at.desc())
        .first()
    )

    if not report:
        return {
            "status": "not_reported",
            "reason": None,
            "reviewed_at": None,
            "report_id": None,
        }

    return {
        "status": report.status,
        "reason": report.reason,
        "reviewed_at": report.reviewed_at,
        "report_id": report.id,
    }


def get_moderation_statistics(db: Session) -> Dict:
    """Get moderation statistics."""
    total = db.query(func.count(ContentReport.id)).scalar()
    open_count = (
        db.query(func.count(ContentReport.id))
        .filter(ContentReport.status == ReportStatus.open)
        .scalar()
    )
    reviewed_count = (
        db.query(func.count(ContentReport.id))
        .filter(ContentReport.status == ReportStatus.reviewed)
        .scalar()
    )
    dismissed_count = (
        db.query(func.count(ContentReport.id))
        .filter(ContentReport.status == ReportStatus.dismissed)
        .scalar()
    )
    deleted_count = (
        db.query(func.count(ContentReport.id))
        .filter(ContentReport.status == ReportStatus.deleted)
        .scalar()
    )

    # Reports by reason
    reason_stats = (
        db.query(ContentReport.reason, func.count(ContentReport.id))
        .group_by(ContentReport.reason)
        .all()
    )
    reports_by_reason = {reason: count for reason, count in reason_stats}

    # Reports by status
    status_stats = (
        db.query(ContentReport.status, func.count(ContentReport.id))
        .group_by(ContentReport.status)
        .all()
    )
    reports_by_status = {status: count for status, count in status_stats}

    return {
        "total_reports": total or 0,
        "open_reports": open_count or 0,
        "reviewed_reports": reviewed_count or 0,
        "dismissed_reports": dismissed_count or 0,
        "deleted_reports": deleted_count or 0,
        "reports_by_reason": reports_by_reason,
        "reports_by_status": reports_by_status,
    }
