from pydantic import BaseModel


class CreateReportRequest(BaseModel):
    title: str
    media_ids: list[str] = []
    note_texts: list[str] = []


class AddReportItemRequest(BaseModel):
    media_id: str | None = None
    note_text: str | None = None
    sort_order: int = 0
    page_break_before: bool = False


class UpdateReportRequest(BaseModel):
    title: str | None = None
    status: str | None = None


class ReportItemResponse(BaseModel):
    id: str
    media_id: str | None
    note_text: str | None
    sort_order: int
    page_break_before: bool
    thumbnail_url: str | None = None

    model_config = {"from_attributes": True}


class ReportResponse(BaseModel):
    id: str
    company_id: str
    project_id: str
    title: str
    status: str
    created_by: str
    pdf_storage_key: str | None
    download_url: str | None = None
    items: list[ReportItemResponse] = []
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
