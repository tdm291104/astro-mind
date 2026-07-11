"""add image_url column to messages

Revision ID: 0008
Revises: 0007
"""
import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("image_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "image_url")
