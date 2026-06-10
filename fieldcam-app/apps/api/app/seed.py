"""Seed the database with sample data for development."""
import asyncio
import uuid

from app.database import async_session, engine, Base
from app.models import *  # noqa: F401,F403
from app.services.auth_service import hash_password


async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        from app.models.user import User
        from app.models.company import Company
        from app.models.membership import Membership
        from app.models.project import Project
        from sqlalchemy import select

        # Check if already seeded
        result = await db.execute(select(User).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded.")
            return

        # Create demo company
        company = Company(name="Demo Adjusting Firm", slug="demo-adjusting")
        db.add(company)
        await db.flush()

        # Create users
        owner = User(
            email="owner@fieldcam.app",
            hashed_password=hash_password("password123"),
            full_name="William Addis",
            phone="(555) 100-0001",
        )
        admin_user = User(
            email="admin@fieldcam.app",
            hashed_password=hash_password("password123"),
            full_name="Sarah Chen",
            phone="(555) 100-0002",
        )
        field_user = User(
            email="field@fieldcam.app",
            hashed_password=hash_password("password123"),
            full_name="Mike Torres",
            phone="(555) 100-0003",
        )
        viewer = User(
            email="viewer@fieldcam.app",
            hashed_password=hash_password("password123"),
            full_name="Jane Smith",
        )
        db.add_all([owner, admin_user, field_user, viewer])
        await db.flush()

        # Create memberships
        db.add_all([
            Membership(company_id=company.id, user_id=owner.id, role="owner", status="active"),
            Membership(company_id=company.id, user_id=admin_user.id, role="admin", status="active"),
            Membership(company_id=company.id, user_id=field_user.id, role="field_user", status="active"),
            Membership(company_id=company.id, user_id=viewer.id, role="viewer", status="active"),
        ])
        await db.flush()

        # Create sample projects
        projects_data = [
            {
                "name": "123 Oak Lane — Hail Damage",
                "project_number": "PRJ-2024-001",
                "status": "active",
                "customer_name": "John Anderson",
                "customer_phone": "(214) 555-0101",
                "address_line_1": "123 Oak Lane",
                "city": "Dallas",
                "state": "TX",
                "postal_code": "75201",
                "claim_number": "CLM-88421",
                "carrier_reference": "STATE-FARM-TX",
                "damage_category": "Hail",
                "inspection_type": "Initial Inspection",
                "loss_date": "2024-03-15T00:00:00Z",
            },
            {
                "name": "456 Elm Street — Wind Damage",
                "project_number": "PRJ-2024-002",
                "status": "new",
                "customer_name": "Maria Garcia",
                "customer_phone": "(214) 555-0202",
                "address_line_1": "456 Elm Street",
                "city": "Fort Worth",
                "state": "TX",
                "postal_code": "76102",
                "claim_number": "CLM-88422",
                "damage_category": "Wind",
                "inspection_type": "Initial Inspection",
            },
            {
                "name": "789 Pine Ave — Water Damage",
                "project_number": "PRJ-2024-003",
                "status": "review",
                "customer_name": "Robert Williams",
                "address_line_1": "789 Pine Ave",
                "city": "Plano",
                "state": "TX",
                "postal_code": "75024",
                "claim_number": "CLM-88423",
                "damage_category": "Water",
                "inspection_type": "Re-inspection",
            },
            {
                "name": "321 Cedar Blvd — Fire Damage",
                "project_number": "PRJ-2024-004",
                "status": "complete",
                "customer_name": "Lisa Johnson",
                "address_line_1": "321 Cedar Blvd",
                "city": "Arlington",
                "state": "TX",
                "postal_code": "76010",
                "claim_number": "CLM-88424",
                "damage_category": "Fire",
                "inspection_type": "Final Inspection",
            },
        ]

        from datetime import datetime
        for p in projects_data:
            loss_date = None
            if "loss_date" in p:
                loss_date = datetime.fromisoformat(p.pop("loss_date").replace("Z", "+00:00"))
            project = Project(
                company_id=company.id,
                created_by=owner.id,
                loss_date=loss_date,
                **p,
            )
            db.add(project)

        await db.commit()
        print("Database seeded successfully!")
        print("  Users: owner@fieldcam.app / admin@fieldcam.app / field@fieldcam.app / viewer@fieldcam.app")
        print("  Password: password123")
        print("  Company: Demo Adjusting Firm")
        print(f"  Projects: {len(projects_data)} created")


if __name__ == "__main__":
    asyncio.run(seed())
