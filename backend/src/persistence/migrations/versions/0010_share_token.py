"""add share_token to conversations

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("share_token", sa.Text(), nullable=True))
    op.create_index("ix_conversations_share_token", "conversations", ["share_token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_conversations_share_token", table_name="conversations")
    op.drop_column("conversations", "share_token")
