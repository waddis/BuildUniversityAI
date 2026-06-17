"""Storage service with local filesystem fallback when S3/MinIO is unavailable."""
import os
import uuid
import shutil
from pathlib import Path

from app.config import get_settings

# Local storage directory
LOCAL_STORAGE_DIR = Path(__file__).parent.parent.parent / "storage"


def _use_local() -> bool:
    """Check if we should use local storage (S3 not reachable)."""
    try:
        client = _get_s3_client()
        client.head_bucket(Bucket=get_settings().storage_bucket)
        return False
    except Exception:
        return True


_local_mode: bool | None = None


def is_local_mode() -> bool:
    global _local_mode
    if _local_mode is None:
        _local_mode = _use_local()
        if _local_mode:
            LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            print(f"[Storage] Using local filesystem: {LOCAL_STORAGE_DIR}")
        else:
            print("[Storage] Using S3/MinIO")
    return _local_mode


def _get_s3_client():
    import boto3
    from botocore.config import Config
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.storage_endpoint,
        aws_access_key_id=settings.storage_access_key,
        aws_secret_access_key=settings.storage_secret_key,
        region_name=settings.storage_region,
        config=Config(signature_version="s3v4"),
    )


def generate_storage_key(company_id: str, project_id: str, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    unique = uuid.uuid4().hex[:12]
    return f"{company_id}/{project_id}/{unique}.{ext}"


def generate_presigned_upload_url(storage_key: str, content_type: str = "application/octet-stream", expires_in: int = 3600) -> str:
    if is_local_mode():
        # Return a local upload endpoint
        settings = get_settings()
        return f"http://localhost:8000/api/v1/media/upload-local/{storage_key}"
    settings = get_settings()
    client = _get_s3_client()
    return client.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.storage_bucket, "Key": storage_key, "ContentType": content_type},
        ExpiresIn=expires_in,
    )


def generate_presigned_download_url(storage_key: str, expires_in: int = 3600) -> str:
    if is_local_mode():
        return f"http://localhost:8000/api/v1/media/file/{storage_key}"
    client = _get_s3_client()
    settings = get_settings()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.storage_bucket, "Key": storage_key},
        ExpiresIn=expires_in,
    )


def get_public_url(storage_key: str) -> str:
    if is_local_mode():
        return f"http://localhost:8000/api/v1/media/file/{storage_key}"
    settings = get_settings()
    return f"{settings.storage_public_url}/{storage_key}"


def save_local_file(storage_key: str, data: bytes) -> str:
    """Save file to local storage directory."""
    file_path = LOCAL_STORAGE_DIR / storage_key
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(data)
    return str(file_path)


def read_local_file(storage_key: str) -> bytes | None:
    """Read file from local storage."""
    file_path = LOCAL_STORAGE_DIR / storage_key
    if file_path.exists():
        return file_path.read_bytes()
    return None


def delete_object(storage_key: str):
    if is_local_mode():
        file_path = LOCAL_STORAGE_DIR / storage_key
        if file_path.exists():
            file_path.unlink()
        return
    settings = get_settings()
    client = _get_s3_client()
    client.delete_object(Bucket=settings.storage_bucket, Key=storage_key)
