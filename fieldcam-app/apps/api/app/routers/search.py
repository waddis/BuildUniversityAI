import uuid as uuid_mod

from fastapi import APIRouter, Query
from sqlalchemy import select, func

from app.deps import DB, CurrentMembership
from app.models.project import Project
from app.models.media import Media
from app.models.activity import ActivityEvent
from app.models.user import User

router = APIRouter()


@router.get("/projects")
async def search_projects(membership: CurrentMembership, db: DB, q: str = Query("")):
    query = select(Project).where(
        Project.company_id == membership.company_id,
        Project.archived_at.is_(None),
    )
    if q:
        query = query.where(
            Project.name.ilike(f"%{q}%")
            | Project.customer_name.ilike(f"%{q}%")
            | Project.address_line_1.ilike(f"%{q}%")
            | Project.claim_number.ilike(f"%{q}%")
        )
    query = query.order_by(Project.updated_at.desc()).limit(20)
    result = await db.execute(query)
    projects = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "status": p.status,
            "customer_name": p.customer_name,
            "address_line_1": p.address_line_1,
            "city": p.city,
            "state": p.state,
            "claim_number": p.claim_number,
        }
        for p in projects
    ]


@router.get("/media")
async def search_media(membership: CurrentMembership, db: DB, q: str = Query("")):
    query = select(Media).where(Media.company_id == membership.company_id)
    if q:
        query = query.where(
            Media.original_filename.ilike(f"%{q}%")
            | Media.room_label.ilike(f"%{q}%")
            | Media.area_label.ilike(f"%{q}%")
            | Media.notes.ilike(f"%{q}%")
        )
    query = query.order_by(Media.created_at.desc()).limit(50)
    result = await db.execute(query)
    return [
        {
            "id": str(m.id),
            "project_id": str(m.project_id),
            "media_type": m.media_type,
            "original_filename": m.original_filename,
            "room_label": m.room_label,
            "status": m.status,
            "created_at": m.created_at.isoformat(),
        }
        for m in result.scalars().all()
    ]


@router.get("/activity")
async def get_activity(
    membership: CurrentMembership,
    db: DB,
    project_id: str | None = None,
    limit: int = Query(50, le=200),
):
    query = select(ActivityEvent).where(ActivityEvent.company_id == membership.company_id)
    if project_id:
        query = query.where(ActivityEvent.project_id == uuid_mod.UUID(project_id))
    query = query.order_by(ActivityEvent.created_at.desc()).limit(limit)

    result = await db.execute(query)
    events = result.scalars().all()

    actor_ids = {e.actor_user_id for e in events if e.actor_user_id}
    names_by_id = {}
    if actor_ids:
        users_result = await db.execute(select(User).where(User.id.in_(actor_ids)))
        names_by_id = {u.id: u.full_name for u in users_result.scalars().all()}

    response = []
    for e in events:
        actor_name = names_by_id.get(e.actor_user_id) if e.actor_user_id else None

        response.append({
            "id": str(e.id),
            "event_type": e.event_type,
            "entity_type": e.entity_type,
            "entity_id": str(e.entity_id),
            "actor_name": actor_name,
            "metadata": e.event_metadata,
            "created_at": e.created_at.isoformat(),
        })
    return response
