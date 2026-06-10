import uuid as uuid_mod
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy import select, func

from app.deps import DB, CurrentUser, CurrentMembership
from app.models.media import Media, MediaAnnotation
from app.models.project import Project
from app.schemas.media import (
    UploadURLRequest,
    UploadURLResponse,
    CreateMediaRequest,
    UpdateMediaRequest,
    MediaResponse,
    MediaListResponse,
)
from app.services.storage_service import (
    generate_storage_key,
    generate_presigned_upload_url,
    get_public_url,
    delete_object,
    save_local_file,
    read_local_file,
    is_local_mode,
)
from app.services.activity_service import log_activity
import mimetypes

router = APIRouter()


def _media_response(m: Media) -> MediaResponse:
    return MediaResponse(
        id=str(m.id),
        company_id=str(m.company_id),
        project_id=str(m.project_id),
        uploaded_by=str(m.uploaded_by),
        media_type=m.media_type,
        storage_key=m.storage_key,
        original_filename=m.original_filename,
        mime_type=m.mime_type,
        file_size=m.file_size,
        width=m.width,
        height=m.height,
        duration_seconds=m.duration_seconds,
        captured_at=m.captured_at.isoformat() if m.captured_at else None,
        uploaded_at=m.uploaded_at.isoformat(),
        latitude=float(m.latitude) if m.latitude else None,
        longitude=float(m.longitude) if m.longitude else None,
        thumbnail_url=get_public_url(m.thumbnail_key) if m.thumbnail_key else None,
        preview_url=get_public_url(m.preview_key) if m.preview_key else None,
        status=m.status,
        visibility=m.visibility,
        room_label=m.room_label,
        area_label=m.area_label,
        category_label=m.category_label,
        notes=m.notes,
        created_at=m.created_at.isoformat(),
    )


@router.post("/upload-url", response_model=UploadURLResponse)
async def get_upload_url(
    body: UploadURLRequest,
    user: CurrentUser,
    membership: CurrentMembership,
    db: DB,
):
    # Verify project belongs to company
    result = await db.execute(
        select(Project).where(
            Project.id == uuid_mod.UUID(body.project_id),
            Project.company_id == membership.company_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    storage_key = generate_storage_key(
        str(membership.company_id), body.project_id, body.filename
    )
    upload_url = generate_presigned_upload_url(storage_key, body.content_type)

    return UploadURLResponse(
        upload_url=upload_url,
        storage_key=storage_key,
        expires_in=3600,
    )


@router.post("", response_model=MediaResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=MediaResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_media(
    body: CreateMediaRequest,
    user: CurrentUser,
    membership: CurrentMembership,
    db: DB,
):
    # Verify project
    result = await db.execute(
        select(Project).where(
            Project.id == uuid_mod.UUID(body.project_id),
            Project.company_id == membership.company_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    captured_at = None
    if body.captured_at:
        captured_at = datetime.fromisoformat(body.captured_at.replace("Z", "+00:00"))

    media = Media(
        company_id=membership.company_id,
        project_id=uuid_mod.UUID(body.project_id),
        uploaded_by=user.id,
        media_type=body.media_type,
        storage_key=body.storage_key,
        original_filename=body.original_filename,
        mime_type=body.mime_type,
        file_size=body.file_size,
        captured_at=captured_at,
        latitude=body.latitude,
        longitude=body.longitude,
        device_id=body.device_id,
        checksum=body.checksum,
        room_label=body.room_label,
        area_label=body.area_label,
        category_label=body.category_label,
        notes=body.notes,
        status="pending",
    )
    db.add(media)
    await db.flush()

    await log_activity(
        db,
        company_id=membership.company_id,
        event_type="media.uploaded",
        entity_type="media",
        entity_id=media.id,
        actor_user_id=user.id,
        project_id=uuid_mod.UUID(body.project_id),
        metadata={"filename": body.original_filename, "media_type": body.media_type},
    )

    # Generate thumbnail inline if local mode
    if is_local_mode() and body.media_type == "photo":
        try:
            import io
            from PIL import Image as PILImage
            file_data = read_local_file(body.storage_key)
            if file_data:
                img = PILImage.open(io.BytesIO(file_data))
                media.width = img.width
                media.height = img.height
                media.file_size = len(file_data)

                # Thumbnail
                thumb = img.copy()
                thumb.thumbnail((300, 300))
                buf = io.BytesIO()
                thumb.save(buf, format="JPEG", quality=80)
                thumb_key = body.storage_key.rsplit(".", 1)[0] + "_thumb.jpg"
                save_local_file(thumb_key, buf.getvalue())
                media.thumbnail_key = thumb_key

                # Preview
                preview = img.copy()
                preview.thumbnail((1200, 1200))
                buf2 = io.BytesIO()
                preview.save(buf2, format="JPEG", quality=85)
                preview_key = body.storage_key.rsplit(".", 1)[0] + "_preview.jpg"
                save_local_file(preview_key, buf2.getvalue())
                media.preview_key = preview_key

                media.status = "ready"
                await db.flush()
        except Exception:
            pass  # Thumbnail generation is best-effort

    return _media_response(media)


@router.get("/projects/{project_id}", response_model=MediaListResponse)
async def list_project_media(
    project_id: str,
    membership: CurrentMembership,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    project_uuid = uuid_mod.UUID(project_id)

    # Verify project belongs to company
    result = await db.execute(
        select(Project).where(
            Project.id == project_uuid,
            Project.company_id == membership.company_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    # Count
    count_result = await db.execute(
        select(func.count()).where(Media.project_id == project_uuid)
    )
    total = count_result.scalar() or 0

    # Fetch
    query = (
        select(Media)
        .where(Media.project_id == project_uuid)
        .order_by(Media.captured_at.desc().nulls_last(), Media.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = [_media_response(m) for m in result.scalars().all()]

    return MediaListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/{media_id}", response_model=MediaResponse)
async def get_media(media_id: str, membership: CurrentMembership, db: DB):
    result = await db.execute(
        select(Media).where(
            Media.id == uuid_mod.UUID(media_id),
            Media.company_id == membership.company_id,
        )
    )
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return _media_response(media)


@router.patch("/{media_id}", response_model=MediaResponse)
async def update_media(
    media_id: str,
    body: UpdateMediaRequest,
    user: CurrentUser,
    membership: CurrentMembership,
    db: DB,
):
    result = await db.execute(
        select(Media).where(
            Media.id == uuid_mod.UUID(media_id),
            Media.company_id == membership.company_id,
        )
    )
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(media, key, value)
    await db.flush()
    return _media_response(media)


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(
    media_id: str,
    user: CurrentUser,
    membership: CurrentMembership,
    db: DB,
):
    result = await db.execute(
        select(Media).where(
            Media.id == uuid_mod.UUID(media_id),
            Media.company_id == membership.company_id,
        )
    )
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Delete from storage
    try:
        delete_object(media.storage_key)
        if media.thumbnail_key:
            delete_object(media.thumbnail_key)
        if media.preview_key:
            delete_object(media.preview_key)
    except Exception:
        pass  # Storage cleanup is best-effort

    await db.delete(media)

    await log_activity(
        db,
        company_id=membership.company_id,
        event_type="media.deleted",
        entity_type="media",
        entity_id=media.id,
        actor_user_id=user.id,
        project_id=media.project_id,
    )


@router.put("/upload-local/{storage_key:path}")
async def upload_local(storage_key: str, request: Request):
    """Local file upload endpoint — used when S3/MinIO is not available."""
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Empty body")
    save_local_file(storage_key, body)
    return Response(status_code=200)


@router.get("/file/{storage_key:path}")
async def serve_file(storage_key: str):
    """Serve locally stored files."""
    data = read_local_file(storage_key)
    if not data:
        raise HTTPException(status_code=404, detail="File not found")
    content_type, _ = mimetypes.guess_type(storage_key)
    return Response(content=data, media_type=content_type or "application/octet-stream")


@router.post("/{media_id}/annotations", status_code=status.HTTP_201_CREATED)
async def create_annotation(
    media_id: str,
    request: Request,
    user: CurrentUser,
    membership: CurrentMembership,
    db: DB,
):
    result = await db.execute(
        select(Media).where(
            Media.id == uuid_mod.UUID(media_id),
            Media.company_id == membership.company_id,
        )
    )
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    import json
    body = await request.body()
    annotation_data = json.loads(body) if body else {}

    # Get latest version
    latest = await db.execute(
        select(func.max(MediaAnnotation.version)).where(
            MediaAnnotation.media_id == media.id
        )
    )
    version = (latest.scalar() or 0) + 1

    annotation = MediaAnnotation(
        media_id=media.id,
        created_by=user.id,
        annotation_data=annotation_data,
        version=version,
    )
    db.add(annotation)
    await db.flush()
    return {"id": str(annotation.id), "version": version}


@router.get("/{media_id}/annotations")
async def list_annotations(media_id: str, membership: CurrentMembership, db: DB):
    result = await db.execute(
        select(MediaAnnotation)
        .where(MediaAnnotation.media_id == uuid_mod.UUID(media_id))
        .order_by(MediaAnnotation.version.desc())
    )
    annotations = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "created_by": str(a.created_by),
            "annotation_data": a.annotation_data,
            "version": a.version,
            "created_at": a.created_at.isoformat(),
        }
        for a in annotations
    ]
