"""add plan_requests table

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plan_requests",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("user_email", sa.Text(), nullable=False),
        sa.Column("user_name", sa.Text(), nullable=False),
        sa.Column("requested_plan", sa.Text(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_plan_requests_user_id", "plan_requests", ["user_id"])
    op.create_index("ix_plan_requests_status", "plan_requests", ["status"])
    op.create_index("ix_plan_requests_created_at", "plan_requests", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_plan_requests_created_at", table_name="plan_requests")
    op.drop_index("ix_plan_requests_status", table_name="plan_requests")
    op.drop_index("ix_plan_requests_user_id", table_name="plan_requests")
    op.drop_table("plan_requests")
