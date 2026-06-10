from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.deps import DB, CurrentUser
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    MagicLinkRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import (
    register_user,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_user_by_id,
    get_user_primary_membership,
)

router = APIRouter()


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: DB):
    from sqlalchemy import select
    from app.models.user import User

    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == body.email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user, company, membership = await register_user(
        db,
        email=body.email,
        password=body.password,
        full_name=body.full_name,
        company_name=body.company_name,
    )

    access_token = create_access_token(str(user.id), str(company.id))
    refresh_token = create_refresh_token(str(user.id))

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
        ),
    )


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: DB):
    user = await authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    membership = await get_user_primary_membership(db, user.id)
    company_id = str(membership.company_id) if membership else None

    access_token = create_access_token(str(user.id), company_id)
    refresh_token = create_refresh_token(str(user.id))

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
        ),
    )


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: DB):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = await get_user_by_id(db, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    membership = await get_user_primary_membership(db, user.id)
    company_id = str(membership.company_id) if membership else None

    return TokenResponse(
        access_token=create_access_token(str(user.id), company_id),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/logout")
async def logout():
    # Token-based auth — client just discards the token
    return {"message": "Logged out"}


@router.post("/request-magic-link")
async def request_magic_link(body: MagicLinkRequest, db: DB):
    # TODO: Generate and email magic link token
    return {"message": "If the email exists, a magic link has been sent."}


@router.post("/reset-password")
async def reset_password():
    # TODO: Implement password reset flow
    return {"message": "Password reset endpoint"}


@router.get("/me", response_model=UserResponse)
async def get_me(user: CurrentUser):
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
    )
