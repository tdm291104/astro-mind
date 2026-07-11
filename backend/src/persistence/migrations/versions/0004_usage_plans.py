"""add usage_events + plans (seeded)

Revision ID: 0004
Revises: 0003
"""
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usage_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id", sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("feature", sa.String(), nullable=False),
        sa.Column("total_tokens", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("idx_usage_user_time", "usage_events", ["user_id", "created_at"])
    plans = op.create_table(
        "plans",
        sa.Column("name", sa.String(), primary_key=True),
        sa.Column("tokens_per_month", sa.Integer(), nullable=True),
        sa.Column("requests_per_day", sa.Integer(), nullable=True),
        sa.Column("docs_per_notebook", sa.Integer(), nullable=True),
    )
    op.bulk_insert(plans, [
        {"name": "free", "tokens_per_month": 20000, "requests_per_day": 25, "docs_per_notebook": 2},
        {"name": "pro", "tokens_per_month": 200000, "requests_per_day": 300,
         "docs_per_notebook": 20},
        {"name": "team", "tokens_per_month": 1000000, "requests_per_day": None,
         "docs_per_notebook": 100},
    ])


def downgrade() -> None:
    op.drop_table("plans")
    op.drop_index("idx_usage_user_time", "usage_events")
    op.drop_table("usage_events")
