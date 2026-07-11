"""add web_sources column to messages

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-16
"""
import sqlalchemy as sa
from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("web_sources", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "web_sources")
