import uuid as uuid_mod
import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.deps import DB, CurrentUser, CurrentMembership
from app.models.share import ShareLink
from app.models.project import Project
from app.models.report import Report

router = APIRouter()


class CreateShareLinkRequest(BaseModel):
    project_id: str | None = None
    report_id: str | None = None
    expires_in_days: int = 7
    allow_download: bool = False
    password: str | None = None


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_share_link(
    body: CreateShareLinkRequest, user: CurrentUser, membership: CurrentMembership, db: DB
):
    from app.services.auth_service import hash_password

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)
    password_hash = hash_password(body.password) if body.password else None

    link = ShareLink(
        company_id=membership.company_id,
        project_id=uuid_mod.UUID(body.project_id) if body.project_id else None,
        report_id=uuid_mod.UUID(body.report_id) if body.report_id else None,
        token=token,
        expires_at=expires_at,
        allow_download=body.allow_download,
        password_hash=password_hash,
        created_by=user.id,
    )
    db.add(link)
    await db.flush()

    return {
        "id": str(link.id),
        "token": token,
        "url": f"/share/{token}",
        "expires_at": expires_at.isoformat(),
    }


@router.get("/{token}")
async def get_share_link(token: str, db: DB):
    result = await db.execute(
        select(ShareLink).where(ShareLink.token == token, ShareLink.revoked_at.is_(None))
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found or expired")

    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Share link has expired")

    requires_password = link.password_hash is not None

    response = {
        "project_id": str(link.project_id) if link.project_id else None,
        "report_id": str(link.report_id) if link.report_id else None,
        "allow_download": link.allow_download,
        "requires_password": requires_password,
    }

    # If it's a report link, include download URL
    if link.report_id and not requires_password:
        report_result = await db.execute(select(Report).where(Report.id == link.report_id))
        report = report_result.scalar_one_or_none()
        if report and report.pdf_storage_key:
            from app.services.storage_service import generate_presigned_download_url
            response["download_url"] = generate_presigned_download_url(report.pdf_storage_key)

    return response


@router.post("/{token}/access")
async def access_share_link(token: str, db: DB, password: str | None = None):
    result = await db.execute(
        select(ShareLink).where(ShareLink.token == token, ShareLink.revoked_at.is_(None))
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")

    if link.password_hash:
        from app.services.auth_service import verify_password
        if not password or not verify_password(password, link.password_hash):
            raise HTTPException(status_code=403, detail="Invalid password")

    return {"access": "granted", "project_id": str(link.project_id) if link.project_id else None}
