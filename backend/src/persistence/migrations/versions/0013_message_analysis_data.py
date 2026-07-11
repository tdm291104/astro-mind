"""add analysis_data column to messages

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-11
"""
import sqlalchemy as sa
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("analysis_data", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "analysis_data")
