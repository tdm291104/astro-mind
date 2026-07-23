"""add search_images column to messages

Revision ID: 0015
Revises: 0014
Create Date: 2026-07-23
"""
import sqlalchemy as sa
from alembic import op

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("search_images", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "search_images")
