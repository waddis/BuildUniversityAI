from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select

from app.deps import DB, CurrentUser, CurrentMembership, require_role
from app.models.company import Company
from app.models.membership import Membership
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.company import (
    CompanyResponse,
    UpdateCompanyRequest,
    InviteMemberRequest,
    UpdateMemberRequest,
    MembershipResponse,
)
from app.services.auth_service import hash_password

router = APIRouter()


@router.get("/current", response_model=CompanyResponse)
async def get_current_company(membership: CurrentMembership, db: DB):
    result = await db.execute(select(Company).where(Company.id == membership.company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyResponse(
        id=str(company.id),
        name=company.name,
        slug=company.slug,
        created_at=company.created_at.isoformat(),
    )


@router.patch("/current", response_model=CompanyResponse)
async def update_company(
    body: UpdateCompanyRequest,
    membership: CurrentMembership,
    db: DB,
    _=Depends(require_role("owner", "admin")),
):
    result = await db.execute(select(Company).where(Company.id == membership.company_id))
    company = result.scalar_one()
    if body.name is not None:
        company.name = body.name
    await db.flush()
    return CompanyResponse(
        id=str(company.id),
        name=company.name,
        slug=company.slug,
        created_at=company.created_at.isoformat(),
    )


@router.get("/current/members", response_model=list[MembershipResponse])
async def list_members(membership: CurrentMembership, db: DB):
    result = await db.execute(
        select(Membership)
        .where(Membership.company_id == membership.company_id)
        .order_by(Membership.created_at)
    )
    members = result.scalars().all()

    user_ids = {m.user_id for m in members}
    users_by_id = {}
    if user_ids:
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_by_id = {u.id: u for u in users_result.scalars().all()}

    response = []
    for m in members:
        user = users_by_id.get(m.user_id)
        user_resp = None
        if user:
            user_resp = UserResponse(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                phone=user.phone,
                avatar_url=user.avatar_url,
                is_active=user.is_active,
                created_at=user.created_at.isoformat(),
            )
        response.append(
            MembershipResponse(
                id=str(m.id),
                company_id=str(m.company_id),
                user_id=str(m.user_id),
                role=m.role,
                status=m.status,
                user=user_resp,
                created_at=m.created_at.isoformat(),
            )
        )
    return response


@router.post("/current/invite", status_code=status.HTTP_201_CREATED)
async def invite_member(
    body: InviteMemberRequest,
    membership: CurrentMembership,
    db: DB,
    _=Depends(require_role("owner", "admin", "manager")),
):
    # Check if user with this email exists
    result = await db.execute(select(User).where(User.email == body.email.lower().strip()))
    user = result.scalar_one_or_none()

    if not user:
        # Create placeholder user with random password (they'll set it via invite)
        import secrets
        user = User(
            email=body.email.lower().strip(),
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            full_name=None,
        )
        db.add(user)
        await db.flush()

    # Check if already a member
    existing = await db.execute(
        select(Membership).where(
            Membership.company_id == membership.company_id,
            Membership.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already a member")

    new_membership = Membership(
        company_id=membership.company_id,
        user_id=user.id,
        role=body.role,
        status="invited",
    )
    db.add(new_membership)
    await db.flush()

    # TODO: Send invite email
    return {"message": "Invitation sent", "membership_id": str(new_membership.id)}


@router.patch("/current/members/{membership_id}")
async def update_member(
    membership_id: str,
    body: UpdateMemberRequest,
    membership: CurrentMembership,
    db: DB,
    _=Depends(require_role("owner", "admin")),
):
    import uuid as uuid_mod
    result = await db.execute(
        select(Membership).where(
            Membership.id == uuid_mod.UUID(membership_id),
            Membership.company_id == membership.company_id,
        )
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Membership not found")

    if body.role is not None:
        target.role = body.role
    if body.status is not None:
        target.status = body.status
    await db.flush()

    return {"message": "Member updated"}
