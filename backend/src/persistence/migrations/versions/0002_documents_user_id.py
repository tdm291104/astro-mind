# src/persistence/migrations/versions/0002_documents_user_id.py
"""add documents.user_id + index

Revision ID: 0002
Revises: 0001
"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("documents") as batch:
        batch.add_column(sa.Column("user_id", sa.String(), nullable=True))
        batch.create_foreign_key("fk_documents_user", "users", ["user_id"], ["id"])
    op.create_index("idx_documents_user", "documents", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_documents_user", "documents")
    with op.batch_alter_table("documents") as batch:
        batch.drop_constraint("fk_documents_user", type_="foreignkey")
        batch.drop_column("user_id")
