import secrets

from fastapi import APIRouter, status
from sqlalchemy import update

from app.deps import DB, CurrentUser
from app.models.membership import Membership
from app.services.auth_service import hash_password

router = APIRouter()


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(user: CurrentUser, db: DB):
    """Deactivate the account and scrub personal data.

    Rows are retained (media, notes, and activity events reference the user id)
    but the account is locked out and all identifying fields are removed.
    """
    await db.execute(
        update(Membership)
        .where(Membership.user_id == user.id)
        .values(status="suspended")
    )

    user.email = f"deleted-{user.id}@deleted.fieldcam.app"
    user.full_name = None
    user.phone = None
    user.avatar_url = None
    user.hashed_password = hash_password(secrets.token_urlsafe(32))
    user.is_active = False
    await db.flush()
