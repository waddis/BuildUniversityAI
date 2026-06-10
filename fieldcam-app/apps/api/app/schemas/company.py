from pydantic import BaseModel, EmailStr


class CompanyResponse(BaseModel):
    id: str
    name: str
    slug: str
    created_at: str

    model_config = {"from_attributes": True}


class UpdateCompanyRequest(BaseModel):
    name: str | None = None


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: str = "field_user"


class UpdateMemberRequest(BaseModel):
    role: str | None = None
    status: str | None = None


class MembershipResponse(BaseModel):
    id: str
    company_id: str
    user_id: str
    role: str
    status: str
    user: "UserResponse | None" = None
    created_at: str

    model_config = {"from_attributes": True}


from app.schemas.auth import UserResponse  # noqa: E402

MembershipResponse.model_rebuild()
