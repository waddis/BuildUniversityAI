import uuid as uuid_mod
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlalchemy import select

from app.deps import DB, CurrentUser, CurrentMembership
from app.models.report import Report, ReportItem
from app.models.project import Project
from app.models.media import Media
from app.schemas.report import (
    CreateReportRequest,
    UpdateReportRequest,
    ReportResponse,
    ReportItemResponse,
)
from app.services.storage_service import get_public_url, generate_presigned_download_url
from app.services.activity_service import log_activity

router = APIRouter()


async def _report_response(report: Report, db) -> ReportResponse:
    items = []
    for item in report.items:
        thumb = None
        if item.media_id:
            media_result = await db.execute(select(Media).where(Media.id == item.media_id))
            media = media_result.scalar_one_or_none()
            if media and media.thumbnail_key:
                thumb = get_public_url(media.thumbnail_key)
        items.append(ReportItemResponse(
            id=str(item.id),
            media_id=str(item.media_id) if item.media_id else None,
            note_text=item.note_text,
            sort_order=item.sort_order,
            page_break_before=item.page_break_before,
            thumbnail_url=thumb,
        ))

    download_url = None
    if report.pdf_storage_key:
        download_url = generate_presigned_download_url(report.pdf_storage_key)

    return ReportResponse(
        id=str(report.id),
        company_id=str(report.company_id),
        project_id=str(report.project_id),
        title=report.title,
        status=report.status,
        created_by=str(report.created_by),
        pdf_storage_key=report.pdf_storage_key,
        download_url=download_url,
        items=items,
        created_at=report.created_at.isoformat(),
        updated_at=report.updated_at.isoformat(),
    )


@router.get("/projects/{project_id}", response_model=list[ReportResponse])
async def list_reports(project_id: str, membership: CurrentMembership, db: DB):
    proj = await db.execute(
        select(Project).where(Project.id == uuid_mod.UUID(project_id), Project.company_id == membership.company_id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Report).where(Report.project_id == uuid_mod.UUID(project_id)).order_by(Report.created_at.desc())
    )
    return [await _report_response(r, db) for r in result.scalars().all()]


@router.post("/projects/{project_id}", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    project_id: str, body: CreateReportRequest, user: CurrentUser, membership: CurrentMembership, db: DB
):
    proj_uuid = uuid_mod.UUID(project_id)
    proj = await db.execute(
        select(Project).where(Project.id == proj_uuid, Project.company_id == membership.company_id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    report = Report(
        company_id=membership.company_id,
        project_id=proj_uuid,
        title=body.title,
        created_by=user.id,
        status="draft",
    )
    db.add(report)
    await db.flush()

    # Add media items
    sort = 0
    for mid in body.media_ids:
        item = ReportItem(
            report_id=report.id,
            media_id=uuid_mod.UUID(mid),
            sort_order=sort,
        )
        db.add(item)
        sort += 1

    # Add note items
    for text in body.note_texts:
        item = ReportItem(
            report_id=report.id,
            note_text=text,
            sort_order=sort,
        )
        db.add(item)
        sort += 1

    await db.flush()

    await log_activity(db, company_id=membership.company_id, event_type="report.created",
                       entity_type="report", entity_id=report.id, actor_user_id=user.id, project_id=proj_uuid)

    # Reload with items
    await db.refresh(report)
    return await _report_response(report, db)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str, membership: CurrentMembership, db: DB):
    result = await db.execute(
        select(Report).where(Report.id == uuid_mod.UUID(report_id), Report.company_id == membership.company_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return await _report_response(report, db)


@router.patch("/{report_id}", response_model=ReportResponse)
async def update_report(report_id: str, body: UpdateReportRequest, membership: CurrentMembership, db: DB):
    result = await db.execute(
        select(Report).where(Report.id == uuid_mod.UUID(report_id), Report.company_id == membership.company_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(report, key, value)
    await db.flush()
    return await _report_response(report, db)


@router.post("/{report_id}/generate")
async def generate_report(
    report_id: str,
    background_tasks: BackgroundTasks,
    user: CurrentUser,
    membership: CurrentMembership,
    db: DB,
):
    result = await db.execute(
        select(Report).where(Report.id == uuid_mod.UUID(report_id), Report.company_id == membership.company_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status == "generating":
        # A 'generating' status older than 10 minutes means the rendering
        # process died (crash/redeploy) before transitioning the report —
        # let the user regenerate rather than locking the report forever.
        age = datetime.now(timezone.utc) - report.updated_at
        if age < timedelta(minutes=10):
            raise HTTPException(status_code=409, detail="Report is already generating")

    report.status = "generating"
    await db.flush()

    background_tasks.add_task(_generate_in_background, str(report.id))

    return {"message": "Report generation started", "report_id": str(report.id)}


async def _generate_in_background(report_id: str):
    """Render the PDF in its own session after the response is sent."""
    from app.database import async_session
    from app.services.report_service import generate_report_pdf

    async with async_session() as session:
        try:
            await generate_report_pdf(session, report_id)
            await session.commit()
        except Exception:
            await session.rollback()
            result = await session.execute(select(Report).where(Report.id == uuid_mod.UUID(report_id)))
            report = result.scalar_one_or_none()
            if report:
                report.status = "failed"
                await session.commit()


@router.get("/{report_id}/download")
async def download_report(report_id: str, membership: CurrentMembership, db: DB):
    result = await db.execute(
        select(Report).where(Report.id == uuid_mod.UUID(report_id), Report.company_id == membership.company_id)
    )
    report = result.scalar_one_or_none()
    if not report or not report.pdf_storage_key:
        raise HTTPException(status_code=404, detail="Report PDF not available")

    url = generate_presigned_download_url(report.pdf_storage_key)
    return {"download_url": url}
