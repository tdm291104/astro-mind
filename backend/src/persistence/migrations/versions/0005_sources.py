"""add sources registry (seeded)

Revision ID: 0005
Revises: 0004
"""
import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

SEED = [
    {"key": "apod", "name": "APOD (NASA)", "icon": "🚀",
     "endpoint": "api.nasa.gov/planetary/apod"},
    {"key": "arxiv", "name": "arXiv Astro-ph", "icon": "📐",
     "endpoint": "export.arxiv.org/api/query"},
    {"key": "images", "name": "NASA Image Library", "icon": "🌌",
     "endpoint": "images-api.nasa.gov/search"},
    {"key": "web", "name": "Web Search (Tavily)", "icon": "🔎",
     "endpoint": "api.tavily.com/search"},
]


def upgrade() -> None:
    sources = op.create_table(
        "sources",
        sa.Column("key", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("icon", sa.String(), nullable=False),
        sa.Column("endpoint", sa.String(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_status", sa.String(), nullable=True),
        sa.Column("last_latency_ms", sa.Integer(), nullable=True),
        sa.Column("last_checked_at", sa.DateTime(), nullable=True),
    )
    op.bulk_insert(sources, [
        {**s, "enabled": True, "last_status": None,
         "last_latency_ms": None, "last_checked_at": None}
        for s in SEED
    ])


def downgrade() -> None:
    op.drop_table("sources")
