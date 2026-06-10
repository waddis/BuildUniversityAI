from pydantic import BaseModel


class UploadURLRequest(BaseModel):
    project_id: str
    filename: str
    media_type: str = "photo"  # photo or video
    content_type: str = "image/jpeg"


class UploadURLResponse(BaseModel):
    upload_url: str
    storage_key: str
    expires_in: int


class CreateMediaRequest(BaseModel):
    storage_key: str
    project_id: str
    media_type: str = "photo"
    original_filename: str | None = None
    mime_type: str | None = None
    file_size: int | None = None
    captured_at: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    device_id: str | None = None
    checksum: str | None = None
    room_label: str | None = None
    area_label: str | None = None
    category_label: str | None = None
    notes: str | None = None


class UpdateMediaRequest(BaseModel):
    room_label: str | None = None
    area_label: str | None = None
    category_label: str | None = None
    notes: str | None = None
    visibility: str | None = None


class MediaResponse(BaseModel):
    id: str
    company_id: str
    project_id: str
    uploaded_by: str
    media_type: str
    storage_key: str
    original_filename: str | None
    mime_type: str | None
    file_size: int | None
    width: int | None
    height: int | None
    duration_seconds: int | None
    captured_at: str | None
    uploaded_at: str
    latitude: float | None
    longitude: float | None
    thumbnail_url: str | None
    preview_url: str | None
    status: str
    visibility: str
    room_label: str | None
    area_label: str | None
    category_label: str | None
    notes: str | None
    created_at: str

    model_config = {"from_attributes": True}


class MediaListResponse(BaseModel):
    items: list[MediaResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
