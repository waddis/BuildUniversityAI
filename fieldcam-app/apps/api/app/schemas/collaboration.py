from pydantic import BaseModel


class CreateNoteRequest(BaseModel):
    body: str


class UpdateNoteRequest(BaseModel):
    body: str


class NoteResponse(BaseModel):
    id: str
    project_id: str
    author_id: str
    author_name: str | None = None
    body: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class CreateCommentRequest(BaseModel):
    body: str


class CommentResponse(BaseModel):
    id: str
    project_id: str | None
    media_id: str | None
    author_id: str
    author_name: str | None = None
    body: str
    created_at: str

    model_config = {"from_attributes": True}


class CreateTaskRequest(BaseModel):
    title: str
    description: str | None = None
    priority: str = "medium"
    assigned_to: str | None = None
    due_at: str | None = None
    required_photo: bool = False


class UpdateTaskRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    assigned_to: str | None = None
    due_at: str | None = None
    required_photo: bool | None = None


class TaskResponse(BaseModel):
    id: str
    company_id: str
    project_id: str
    title: str
    description: str | None
    status: str
    priority: str
    assigned_to: str | None
    assignee_name: str | None = None
    due_at: str | None
    required_photo: bool
    completed_at: str | None
    completed_by: str | None
    created_by: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    items: list[TaskResponse]
    total: int
