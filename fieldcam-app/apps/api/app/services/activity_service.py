import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityEvent


async def log_activity(
    db: AsyncSession,
    company_id: uuid.UUID,
    event_type: str,
    entity_type: str,
    entity_id: uuid.UUID,
    actor_user_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
    metadata: dict | None = None,
) -> ActivityEvent:
    event = ActivityEvent(
        company_id=company_id,
        project_id=project_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        event_metadata=metadata,
    )
    db.add(event)
    await db.flush()
    return event
