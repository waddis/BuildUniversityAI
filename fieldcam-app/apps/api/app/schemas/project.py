from pydantic import BaseModel


class CreateProjectRequest(BaseModel):
    name: str
    project_number: str | None = None
    status: str = "new"
    customer_name: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None
    address_line_1: str | None = None
    address_line_2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    loss_date: str | None = None
    claim_number: str | None = None
    policyholder_name: str | None = None
    inspection_type: str | None = None
    damage_category: str | None = None
    carrier_reference: str | None = None
    site_contact: str | None = None


class UpdateProjectRequest(BaseModel):
    name: str | None = None
    project_number: str | None = None
    status: str | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None
    address_line_1: str | None = None
    address_line_2: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    loss_date: str | None = None
    claim_number: str | None = None
    policyholder_name: str | None = None
    inspection_type: str | None = None
    damage_category: str | None = None
    carrier_reference: str | None = None
    site_contact: str | None = None


class ProjectResponse(BaseModel):
    id: str
    company_id: str
    name: str
    project_number: str | None
    status: str
    customer_name: str | None
    customer_email: str | None
    customer_phone: str | None
    address_line_1: str | None
    address_line_2: str | None
    city: str | None
    state: str | None
    postal_code: str | None
    country: str | None
    latitude: float | None
    longitude: float | None
    loss_date: str | None
    claim_number: str | None
    policyholder_name: str | None
    inspection_type: str | None
    damage_category: str | None
    carrier_reference: str | None
    site_contact: str | None
    created_by: str
    created_at: str
    updated_at: str
    media_count: int = 0

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
