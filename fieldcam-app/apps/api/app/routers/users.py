import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, status
from sqlalchemy import delete, update

from app.deps import DB, CurrentUser
from app.models.membership import Membership
from app.models.share import ShareLink
from app.services.auth_service import hash_password

router = APIRouter()


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(user: CurrentUser, db: DB):
    """Deactivate the account and scrub personal data.

    The user row is retained (media, notes, and activity events reference the
    user id) but identifying fields are removed, memberships are deleted so the
    user no longer appears in team lists and the email can be re-invited, and
    any share links they created are revoked.
    """
    await db.execute(delete(Membership).where(Membership.user_id == user.id))
    await db.execute(
        update(ShareLink)
        .where(ShareLink.created_by == user.id, ShareLink.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )

    user.email = f"deleted-{user.id}@deleted.fieldcam.app"
    user.full_name = None
    user.phone = None
    user.avatar_url = None
    user.hashed_password = hash_password(secrets.token_urlsafe(32))
    user.is_active = False
