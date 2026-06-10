import uuid as uuid_mod
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, func

from app.deps import DB, CurrentUser, CurrentMembership
from app.models.task import Task
from app.models.project import Project
from app.models.user import User
from app.schemas.collaboration import CreateTaskRequest, UpdateTaskRequest, TaskResponse, TaskListResponse
from app.services.activity_service import log_activity

router = APIRouter()


async def _task_response(t: Task, db) -> TaskResponse:
    assignee_name = None
    if t.assigned_to:
        user_result = await db.execute(select(User).where(User.id == t.assigned_to))
        assignee = user_result.scalar_one_or_none()
        assignee_name = assignee.full_name if assignee else None

    return TaskResponse(
        id=str(t.id),
        company_id=str(t.company_id),
        project_id=str(t.project_id),
        title=t.title,
        description=t.description,
        status=t.status,
        priority=t.priority,
        assigned_to=str(t.assigned_to) if t.assigned_to else None,
        assignee_name=assignee_name,
        due_at=t.due_at.isoformat() if t.due_at else None,
        required_photo=t.required_photo,
        completed_at=t.completed_at.isoformat() if t.completed_at else None,
        completed_by=str(t.completed_by) if t.completed_by else None,
        created_by=str(t.created_by),
        created_at=t.created_at.isoformat(),
        updated_at=t.updated_at.isoformat(),
    )


@router.get("/projects/{project_id}", response_model=TaskListResponse)
async def list_tasks(
    project_id: str,
    membership: CurrentMembership,
    db: DB,
    status_filter: str | None = Query(None, alias="status"),
):
    proj = await db.execute(
        select(Project).where(Project.id == uuid_mod.UUID(project_id), Project.company_id == membership.company_id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    query = select(Task).where(Task.project_id == uuid_mod.UUID(project_id))
    if status_filter:
        query = query.where(Task.status == status_filter)
    query = query.order_by(Task.created_at.desc())

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    result = await db.execute(query)
    tasks = result.scalars().all()
    items = [await _task_response(t, db) for t in tasks]

    return TaskListResponse(items=items, total=total)


@router.post("/projects/{project_id}", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: str, body: CreateTaskRequest, user: CurrentUser, membership: CurrentMembership, db: DB
):
    proj_uuid = uuid_mod.UUID(project_id)
    proj = await db.execute(
        select(Project).where(Project.id == proj_uuid, Project.company_id == membership.company_id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    due_at = None
    if body.due_at:
        due_at = datetime.fromisoformat(body.due_at.replace("Z", "+00:00"))

    task = Task(
        company_id=membership.company_id,
        project_id=proj_uuid,
        title=body.title,
        description=body.description,
        priority=body.priority,
        assigned_to=uuid_mod.UUID(body.assigned_to) if body.assigned_to else None,
        due_at=due_at,
        required_photo=body.required_photo,
        created_by=user.id,
    )
    db.add(task)
    await db.flush()

    await log_activity(db, company_id=membership.company_id, event_type="task.created",
                       entity_type="task", entity_id=task.id, actor_user_id=user.id, project_id=proj_uuid,
                       metadata={"title": task.title})

    return await _task_response(task, db)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, body: UpdateTaskRequest, user: CurrentUser, membership: CurrentMembership, db: DB):
    result = await db.execute(
        select(Task).where(Task.id == uuid_mod.UUID(task_id), Task.company_id == membership.company_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = body.model_dump(exclude_unset=True)

    # Handle completion
    if "status" in update_data and update_data["status"] == "done" and task.status != "done":
        task.completed_at = datetime.now(timezone.utc)
        task.completed_by = user.id

    if "due_at" in update_data and update_data["due_at"]:
        update_data["due_at"] = datetime.fromisoformat(update_data["due_at"].replace("Z", "+00:00"))
    if "assigned_to" in update_data and update_data["assigned_to"]:
        update_data["assigned_to"] = uuid_mod.UUID(update_data["assigned_to"])

    for key, value in update_data.items():
        setattr(task, key, value)
    await db.flush()

    await log_activity(db, company_id=membership.company_id, event_type="task.updated",
                       entity_type="task", entity_id=task.id, actor_user_id=user.id, project_id=task.project_id,
                       metadata={"fields": list(update_data.keys())})

    return await _task_response(task, db)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, user: CurrentUser, membership: CurrentMembership, db: DB):
    result = await db.execute(
        select(Task).where(Task.id == uuid_mod.UUID(task_id), Task.company_id == membership.company_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
