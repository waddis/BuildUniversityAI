import uuid as uuid_mod

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import DB, CurrentUser, CurrentMembership
from app.models.collaboration import ProjectNote
from app.models.project import Project
from app.models.user import User
from app.schemas.collaboration import CreateNoteRequest, UpdateNoteRequest, NoteResponse
from app.services.activity_service import log_activity

router = APIRouter()


async def _note_response(note: ProjectNote, db) -> NoteResponse:
    user_result = await db.execute(select(User).where(User.id == note.author_id))
    author = user_result.scalar_one_or_none()
    return NoteResponse(
        id=str(note.id),
        project_id=str(note.project_id),
        author_id=str(note.author_id),
        author_name=author.full_name if author else None,
        body=note.body,
        created_at=note.created_at.isoformat(),
        updated_at=note.updated_at.isoformat(),
    )


@router.get("/projects/{project_id}", response_model=list[NoteResponse])
async def list_notes(project_id: str, membership: CurrentMembership, db: DB):
    # Verify project
    proj = await db.execute(
        select(Project).where(Project.id == uuid_mod.UUID(project_id), Project.company_id == membership.company_id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(ProjectNote)
        .where(ProjectNote.project_id == uuid_mod.UUID(project_id))
        .order_by(ProjectNote.created_at.desc())
    )
    notes = result.scalars().all()
    return [await _note_response(n, db) for n in notes]


@router.post("/projects/{project_id}", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    project_id: str, body: CreateNoteRequest, user: CurrentUser, membership: CurrentMembership, db: DB
):
    proj_uuid = uuid_mod.UUID(project_id)
    proj = await db.execute(
        select(Project).where(Project.id == proj_uuid, Project.company_id == membership.company_id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    note = ProjectNote(project_id=proj_uuid, author_id=user.id, body=body.body)
    db.add(note)
    await db.flush()

    await log_activity(db, company_id=membership.company_id, event_type="note.created",
                       entity_type="note", entity_id=note.id, actor_user_id=user.id, project_id=proj_uuid)

    return await _note_response(note, db)


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, body: UpdateNoteRequest, user: CurrentUser, membership: CurrentMembership, db: DB):
    result = await db.execute(select(ProjectNote).where(ProjectNote.id == uuid_mod.UUID(note_id)))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.body = body.body
    await db.flush()
    return await _note_response(note, db)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: str, user: CurrentUser, membership: CurrentMembership, db: DB):
    result = await db.execute(select(ProjectNote).where(ProjectNote.id == uuid_mod.UUID(note_id)))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
