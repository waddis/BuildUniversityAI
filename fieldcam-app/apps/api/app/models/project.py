import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, Numeric, DateTime, Integer, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class Project(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "projects"

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    project_number: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="new")
    # Customer info
    customer_name: Mapped[str | None] = mapped_column(String(255))
    customer_email: Mapped[str | None] = mapped_column(String(320))
    customer_phone: Mapped[str | None] = mapped_column(String(50))
    # Address
    address_line_1: Mapped[str | None] = mapped_column(String(500))
    address_line_2: Mapped[str | None] = mapped_column(String(500))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    country: Mapped[str | None] = mapped_column(String(100))
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 7))
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 7))
    # Insurance / claim fields
    loss_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    claim_number: Mapped[str | None] = mapped_column(String(100))
    policyholder_name: Mapped[str | None] = mapped_column(String(255))
    inspection_type: Mapped[str | None] = mapped_column(String(100))
    damage_category: Mapped[str | None] = mapped_column(String(100))
    carrier_reference: Mapped[str | None] = mapped_column(String(255))
    site_contact: Mapped[str | None] = mapped_column(String(255))
    # Meta
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    assignments = relationship("ProjectAssignment", back_populates="project", lazy="selectin")
    tags = relationship("ProjectTag", back_populates="project", lazy="selectin")


class ProjectAssignment(Base, UUIDMixin):
    __tablename__ = "project_assignments"
    __table_args__ = (UniqueConstraint("project_id", "user_id"),)

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    assigned_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )

    project = relationship("Project", back_populates="assignments")


class Tag(Base, UUIDMixin):
    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("company_id", "name"),)

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )


class ProjectTag(Base, UUIDMixin):
    __tablename__ = "project_tags"
    __table_args__ = (UniqueConstraint("project_id", "tag_id"),)

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tags.id"), nullable=False
    )

    project = relationship("Project", back_populates="tags")
    tag = relationship("Tag")
