import uuid as uuid_mod

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import DB, CurrentUser, CurrentMembership
from app.models.collaboration import Comment
from app.models.project import Project
from app.models.media import Media
from app.models.user import User
from app.schemas.collaboration import CreateCommentRequest, CommentResponse
from app.services.activity_service import log_activity

router = APIRouter()


async def _comment_response(c: Comment, db) -> CommentResponse:
    user_result = await db.execute(select(User).where(User.id == c.author_id))
    author = user_result.scalar_one_or_none()
    return CommentResponse(
        id=str(c.id),
        project_id=str(c.project_id) if c.project_id else None,
        media_id=str(c.media_id) if c.media_id else None,
        author_id=str(c.author_id),
        author_name=author.full_name if author else None,
        body=c.body,
        created_at=c.created_at.isoformat(),
    )


@router.get("/projects/{project_id}", response_model=list[CommentResponse])
async def list_project_comments(project_id: str, membership: CurrentMembership, db: DB):
    proj = await db.execute(
        select(Project).where(Project.id == uuid_mod.UUID(project_id), Project.company_id == membership.company_id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Comment)
        .where(Comment.project_id == uuid_mod.UUID(project_id))
        .order_by(Comment.created_at.desc())
    )
    return [await _comment_response(c, db) for c in result.scalars().all()]


@router.post("/projects/{project_id}", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_project_comment(
    project_id: str, body: CreateCommentRequest, user: CurrentUser, membership: CurrentMembership, db: DB
):
    proj_uuid = uuid_mod.UUID(project_id)
    comment = Comment(project_id=proj_uuid, author_id=user.id, body=body.body)
    db.add(comment)
    await db.flush()
    await log_activity(db, company_id=membership.company_id, event_type="comment.created",
                       entity_type="comment", entity_id=comment.id, actor_user_id=user.id, project_id=proj_uuid)
    return await _comment_response(comment, db)


@router.get("/media/{media_id}", response_model=list[CommentResponse])
async def list_media_comments(media_id: str, membership: CurrentMembership, db: DB):
    result = await db.execute(
        select(Comment).where(Comment.media_id == uuid_mod.UUID(media_id)).order_by(Comment.created_at.desc())
    )
    return [await _comment_response(c, db) for c in result.scalars().all()]


@router.post("/media/{media_id}", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_media_comment(
    media_id: str, body: CreateCommentRequest, user: CurrentUser, membership: CurrentMembership, db: DB
):
    media_uuid = uuid_mod.UUID(media_id)
    media = await db.execute(select(Media).where(Media.id == media_uuid, Media.company_id == membership.company_id))
    if not media.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Media not found")

    comment = Comment(media_id=media_uuid, author_id=user.id, body=body.body)
    db.add(comment)
    await db.flush()
    return await _comment_response(comment, db)
