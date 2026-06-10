import io
import uuid

from arq.connections import RedisSettings
from PIL import Image
from sqlalchemy import select

from app.config import get_settings
from app.database import async_session
from app.models.media import Media


async def process_media(ctx, media_id: str):
    """Validate media, extract metadata, generate thumbnails."""
    async with async_session() as db:
        result = await db.execute(select(Media).where(Media.id == uuid.UUID(media_id)))
        media = result.scalar_one_or_none()
        if not media:
            return

        media.status = "processing"
        await db.commit()

        try:
            from app.services.storage_service import get_s3_client, get_settings as get_s

            settings = get_s()
            client = get_s3_client()

            # Download original
            response = client.get_object(Bucket=settings.storage_bucket, Key=media.storage_key)
            data = response["Body"].read()
            media.file_size = len(data)

            if media.media_type == "photo":
                img = Image.open(io.BytesIO(data))
                media.width = img.width
                media.height = img.height

                # Generate thumbnail (300px)
                thumb = img.copy()
                thumb.thumbnail((300, 300))
                thumb_buffer = io.BytesIO()
                thumb.save(thumb_buffer, format="JPEG", quality=80)
                thumb_buffer.seek(0)

                thumb_key = media.storage_key.rsplit(".", 1)[0] + "_thumb.jpg"
                client.put_object(
                    Bucket=settings.storage_bucket,
                    Key=thumb_key,
                    Body=thumb_buffer.getvalue(),
                    ContentType="image/jpeg",
                )
                media.thumbnail_key = thumb_key

                # Generate preview (1200px)
                preview = img.copy()
                preview.thumbnail((1200, 1200))
                preview_buffer = io.BytesIO()
                preview.save(preview_buffer, format="JPEG", quality=85)
                preview_buffer.seek(0)

                preview_key = media.storage_key.rsplit(".", 1)[0] + "_preview.jpg"
                client.put_object(
                    Bucket=settings.storage_bucket,
                    Key=preview_key,
                    Body=preview_buffer.getvalue(),
                    ContentType="image/jpeg",
                )
                media.preview_key = preview_key

            media.status = "ready"
            await db.commit()

        except Exception as e:
            media.status = "failed"
            await db.commit()
            raise


async def generate_report(ctx, report_id: str):
    """Render report to PDF and upload to storage."""
    # TODO: Implement with WeasyPrint
    pass


async def send_email(ctx, to: str, subject: str, body: str):
    """Send transactional email via SMTP."""
    import aiosmtplib
    from email.message import EmailMessage

    settings = get_settings()
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
    )


async def cleanup_expired_shares(ctx):
    """Remove expired share links."""
    from datetime import datetime, timezone
    from app.models.share import ShareLink

    async with async_session() as db:
        result = await db.execute(
            select(ShareLink).where(
                ShareLink.expires_at < datetime.now(timezone.utc),
                ShareLink.revoked_at.is_(None),
            )
        )
        for link in result.scalars().all():
            link.revoked_at = datetime.now(timezone.utc)
        await db.commit()


async def startup(ctx):
    """Worker startup."""
    pass


async def shutdown(ctx):
    """Worker shutdown."""
    pass


settings = get_settings()


class WorkerSettings:
    functions = [process_media, generate_report, send_email, cleanup_expired_shares]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 10
    job_timeout = 300
    cron_jobs = [
        # Clean up expired shares every hour
    ]
