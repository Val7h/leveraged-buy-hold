from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.moderation import ContentReport, ContentModerationLog
from app.schemas.moderation import (
    ContentReportCreate,
    ContentReportResponse,
    ContentReportDetailResponse,
    ModerationActionRequest,
    ModerationLogResponse,
    ModerationStatsResponse,
)
from app.services.content_moderation import (
    check_content_for_violations,
    create_content_report,
    get_open_reports,
    get_all_reports,
    get_report_detail,
    process_report_action,
    dismiss_report,
    get_moderation_logs,
    get_moderation_status,
    get_moderation_statistics,
)

router = APIRouter(prefix="/content", tags=["content-moderation"])


def is_admin(current_user: User = Depends(get_current_user)) -> User:
    """Verify user is admin. Extend this with your admin role logic."""
    # TODO: Implement proper admin role check in User model
    # For now, you can check against a hardcoded admin list or role field
    admin_emails = ["admin@example.com"]  # Configure in settings
    if current_user.email not in admin_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.post("/check", status_code=200)
def check_content(
    text: str = Query(..., min_length=1, max_length=5000),
    current_user: User = Depends(get_current_user),
):
    """
    Check content for violations (banned words, patterns).
    Does NOT create a report - just performs analysis.
    """
    violations = check_content_for_violations(text)
    return {
        "text_length": len(text),
        "flagged": violations["flagged"],
        "reason": violations["reason"],
        "severity": violations["severity"],
        "detected_words": violations["detected_words"],
    }


@router.post("/report", response_model=ContentReportResponse, status_code=201)
def report_content(
    report_data: ContentReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Report inappropriate content.
    Any authenticated user can report content.
    """
    # Prevent self-reporting (optional - adjust based on requirements)
    # Check if message belongs to user, etc.

    report = create_content_report(
        db=db,
        message_id=report_data.message_id,
        reporter_id=current_user.id,
        reason=report_data.reason.value,
        description=report_data.description,
    )

    return {
        "id": report.id,
        "message_id": report.message_id,
        "reporter_id": report.reporter_id,
        "reason": report.reason,
        "description": report.description,
        "status": report.status,
        "reviewed_by": report.reviewed_by,
        "reviewed_at": report.reviewed_at,
        "created_at": report.created_at,
    }


@router.get(
    "/moderation-status/{message_id}",
    status_code=200,
)
def check_moderation_status(
    message_id: str,
    db: Session = Depends(get_db),
):
    """
    Check moderation status of a message.
    Public endpoint - anyone can check if a message is flagged.
    """
    status_info = get_moderation_status(db, message_id)
    return status_info


@router.get(
    "/admin/reports",
    response_model=List[ContentReportDetailResponse],
    status_code=200,
)
def list_reports(
    status: Optional[str] = Query(None, description="Filter by status: open, reviewed, dismissed, deleted"),
    reason: Optional[str] = Query(None, description="Filter by reason"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin),
):
    """
    List all reports with optional filtering.
    Admin only.
    """
    reports = get_all_reports(db, status=status, reason=reason, skip=skip, limit=limit)

    result = []
    for report in reports:
        result.append(
            {
                "id": report.id,
                "message_id": report.message_id,
                "reporter_id": report.reporter_id,
                "reporter_email": report.reporter.email if report.reporter else None,
                "reason": report.reason,
                "description": report.description,
                "status": report.status,
                "reviewed_by": report.reviewed_by,
                "reviewer_email": report.reviewer.email if report.reviewer else None,
                "reviewed_at": report.reviewed_at,
                "created_at": report.created_at,
            }
        )

    return result


@router.get(
    "/admin/reports/{report_id}",
    response_model=ContentReportDetailResponse,
    status_code=200,
)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin),
):
    """
    Get detailed information about a report.
    Admin only.
    """
    report = get_report_detail(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "id": report.id,
        "message_id": report.message_id,
        "reporter_id": report.reporter_id,
        "reporter_email": report.reporter.email if report.reporter else None,
        "reason": report.reason,
        "description": report.description,
        "status": report.status,
        "reviewed_by": report.reviewed_by,
        "reviewer_email": report.reviewer.email if report.reviewer else None,
        "reviewed_at": report.reviewed_at,
        "created_at": report.created_at,
    }


@router.put(
    "/admin/reports/{report_id}/action",
    status_code=200,
)
def take_moderation_action(
    report_id: int,
    action_data: ModerationActionRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin),
):
    """
    Take moderation action on a report.
    Actions: delete (remove content), approve (dismiss report), warn (warn user)
    Admin only.
    """
    result = process_report_action(
        db=db,
        report_id=report_id,
        action=action_data.action.value,
        moderator_id=admin_user.id,
        reason=action_data.reason,
    )

    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])

    return {
        "success": result["success"],
        "message": result["message"],
        "log_id": result["log_id"],
    }


@router.put(
    "/admin/reports/{report_id}/dismiss",
    status_code=200,
)
def dismiss_content_report(
    report_id: int,
    reason: str = Query(..., min_length=10, max_length=500),
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin),
):
    """
    Dismiss a report (content is OK, no action needed).
    Admin only.
    """
    result = dismiss_report(
        db=db,
        report_id=report_id,
        moderator_id=admin_user.id,
        reason=reason,
    )

    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])

    return result


@router.get(
    "/admin/logs",
    response_model=List[ModerationLogResponse],
    status_code=200,
)
def list_moderation_logs(
    message_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin),
):
    """
    List all moderation actions/logs.
    Admin only.
    """
    logs = get_moderation_logs(db, message_id=message_id, skip=skip, limit=limit)

    result = []
    for log in logs:
        result.append(
            {
                "id": log.id,
                "message_id": log.message_id,
                "action": log.action,
                "moderator_id": log.moderator_id,
                "moderator_email": log.moderator.email if log.moderator else None,
                "reason": log.reason,
                "created_at": log.created_at,
            }
        )

    return result


@router.get(
    "/admin/statistics",
    response_model=ModerationStatsResponse,
    status_code=200,
)
def get_statistics(
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin),
):
    """
    Get moderation statistics and analytics.
    Admin only.
    """
    return get_moderation_statistics(db)


@router.get(
    "/admin/open-reports-count",
    status_code=200,
)
def get_open_count(
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin),
):
    """
    Quick endpoint to get count of open reports (for dashboard).
    Admin only.
    """
    open_reports = get_open_reports(db, skip=0, limit=1)
    from sqlalchemy import func
    from app.models.moderation import ReportStatus

    count = (
        db.query(func.count(ContentReport.id))
        .filter(ContentReport.status == ReportStatus.open)
        .scalar()
    )

    return {
        "open_count": count or 0,
    }
