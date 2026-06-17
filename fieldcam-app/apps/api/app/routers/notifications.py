import uuid as uuid_mod
from datetime import datetime, timezone

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.deps import DB, CurrentUser
from app.models.notification import Notification

router = APIRouter()


@router.get("")
async def list_notifications(
    user: CurrentUser,
    db: DB,
    unread_only: bool = False,
    limit: int = Query(50, le=200),
):
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    query = query.order_by(Notification.created_at.desc()).limit(limit)

    result = await db.execute(query)
    notifications = result.scalars().all()
    return [
        {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "data": n.data,
            "read_at": n.read_at.isoformat() if n.read_at else None,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, user: CurrentUser, db: DB):
    result = await db.execute(
        select(Notification).where(
            Notification.id == uuid_mod.UUID(notification_id),
            Notification.user_id == user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if notification and not notification.read_at:
        notification.read_at = datetime.now(timezone.utc)
        await db.flush()
    return {"status": "ok"}
