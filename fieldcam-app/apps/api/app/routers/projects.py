import uuid as uuid_mod
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select, func

from app.deps import DB, CurrentUser, CurrentMembership
from app.models.project import Project, ProjectAssignment
from app.models.media import Media
from app.schemas.project import (
    CreateProjectRequest,
    UpdateProjectRequest,
    ProjectResponse,
    ProjectListResponse,
)
from app.services.activity_service import log_activity

router = APIRouter()


def _project_response(project: Project, media_count: int = 0) -> ProjectResponse:
    return ProjectResponse(
        id=str(project.id),
        company_id=str(project.company_id),
        name=project.name,
        project_number=project.project_number,
        status=project.status,
        customer_name=project.customer_name,
        customer_email=project.customer_email,
        customer_phone=project.customer_phone,
        address_line_1=project.address_line_1,
        address_line_2=project.address_line_2,
        city=project.city,
        state=project.state,
        postal_code=project.postal_code,
        country=project.country,
        latitude=float(project.latitude) if project.latitude else None,
        longitude=float(project.longitude) if project.longitude else None,
        loss_date=project.loss_date.isoformat() if project.loss_date else None,
        claim_number=project.claim_number,
        policyholder_name=project.policyholder_name,
        inspection_type=project.inspection_type,
        damage_category=project.damage_category,
        carrier_reference=project.carrier_reference,
        site_contact=project.site_contact,
        created_by=str(project.created_by),
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat(),
        media_count=media_count,
    )


@router.get("", response_model=ProjectListResponse)
@router.get("/", response_model=ProjectListResponse, include_in_schema=False)
async def list_projects(
    membership: CurrentMembership,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    q: str | None = None,
):
    # Base query — tenant isolation
    query = select(Project).where(
        Project.company_id == membership.company_id,
        Project.archived_at.is_(None),
    )

    if status_filter:
        query = query.where(Project.status == status_filter)
    if q:
        query = query.where(Project.name.ilike(f"%{q}%"))

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    query = query.order_by(Project.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    projects = result.scalars().all()

    items = []
    for p in projects:
        media_count_result = await db.execute(
            select(func.count()).where(Media.project_id == p.id)
        )
        mc = media_count_result.scalar() or 0
        items.append(_project_response(p, mc))

    return ProjectListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_project(
    body: CreateProjectRequest,
    user: CurrentUser,
    membership: CurrentMembership,
    db: DB,
):
    loss_date = None
    if body.loss_date:
        loss_date = datetime.fromisoformat(body.loss_date.replace("Z", "+00:00"))

    project = Project(
        company_id=membership.company_id,
        created_by=user.id,
        name=body.name,
        project_number=body.project_number,
        status=body.status,
        customer_name=body.customer_name,
        customer_email=body.customer_email,
        customer_phone=body.customer_phone,
        address_line_1=body.address_line_1,
        address_line_2=body.address_line_2,
        city=body.city,
        state=body.state,
        postal_code=body.postal_code,
        country=body.country,
        latitude=body.latitude,
        longitude=body.longitude,
        loss_date=loss_date,
        claim_number=body.claim_number,
        policyholder_name=body.policyholder_name,
        inspection_type=body.inspection_type,
        damage_category=body.damage_category,
        carrier_reference=body.carrier_reference,
        site_contact=body.site_contact,
    )
    db.add(project)
    await db.flush()

    await log_activity(
        db,
        company_id=membership.company_id,
        event_type="project.created",
        entity_type="project",
        entity_id=project.id,
        actor_user_id=user.id,
        project_id=project.id,
        metadata={"name": project.name},
    )

    return _project_response(project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, membership: CurrentMembership, db: DB):
    result = await db.execute(
        select(Project).where(
            Project.id == uuid_mod.UUID(project_id),
            Project.company_id == membership.company_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    media_count_result = await db.execute(
        select(func.count()).where(Media.project_id == project.id)
    )
    mc = media_count_result.scalar() or 0
    return _project_response(project, mc)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: UpdateProjectRequest,
    user: CurrentUser,
    membership: CurrentMembership,
    db: DB,
):
    result = await db.execute(
        select(Project).where(
            Project.id == uuid_mod.UUID(project_id),
            Project.company_id == membership.company_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = body.model_dump(exclude_unset=True)
    if "loss_date" in update_data and update_data["loss_date"]:
        update_data["loss_date"] = datetime.fromisoformat(
            update_data["loss_date"].replace("Z", "+00:00")
        )

    for key, value in update_data.items():
        setattr(project, key, value)
    await db.flush()

    await log_activity(
        db,
        company_id=membership.company_id,
        event_type="project.updated",
        entity_type="project",
        entity_id=project.id,
        actor_user_id=user.id,
        project_id=project.id,
        metadata={"fields": list(update_data.keys())},
    )

    return _project_response(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user: CurrentUser,
    membership: CurrentMembership,
    db: DB,
):
    result = await db.execute(
        select(Project).where(
            Project.id == uuid_mod.UUID(project_id),
            Project.company_id == membership.company_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Soft delete via archive
    project.archived_at = datetime.utcnow()
    project.status = "archived"
    await db.flush()

    await log_activity(
        db,
        company_id=membership.company_id,
        event_type="project.archived",
        entity_type="project",
        entity_id=project.id,
        actor_user_id=user.id,
        project_id=project.id,
    )


@router.post("/{project_id}/assignments", status_code=status.HTTP_201_CREATED)
async def assign_user(
    project_id: str,
    user: CurrentUser,
    membership: CurrentMembership,
    db: DB,
    user_id: str = Query(...),
):
    project_uuid = uuid_mod.UUID(project_id)
    target_uuid = uuid_mod.UUID(user_id)

    # Verify project belongs to company
    result = await db.execute(
        select(Project).where(Project.id == project_uuid, Project.company_id == membership.company_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    # Check duplicate
    existing = await db.execute(
        select(ProjectAssignment).where(
            ProjectAssignment.project_id == project_uuid,
            ProjectAssignment.user_id == target_uuid,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User already assigned")

    assignment = ProjectAssignment(
        project_id=project_uuid,
        user_id=target_uuid,
        assigned_by=user.id,
    )
    db.add(assignment)
    await db.flush()
    return {"message": "User assigned", "assignment_id": str(assignment.id)}


@router.delete("/{project_id}/assignments/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_user(project_id: str, user_id: str, membership: CurrentMembership, db: DB):
    result = await db.execute(
        select(ProjectAssignment).where(
            ProjectAssignment.project_id == uuid_mod.UUID(project_id),
            ProjectAssignment.user_id == uuid_mod.UUID(user_id),
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await db.delete(assignment)


@router.post("/{project_id}/tags", status_code=status.HTTP_201_CREATED)
async def add_tag(project_id: str, membership: CurrentMembership, db: DB):
    return {"message": "add tag endpoint"}


@router.delete("/{project_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tag(project_id: str, tag_id: str, membership: CurrentMembership, db: DB):
    pass
