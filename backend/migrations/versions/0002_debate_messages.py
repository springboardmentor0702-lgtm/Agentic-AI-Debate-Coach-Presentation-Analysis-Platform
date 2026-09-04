"""Add persisted debate messages for real multi-turn/live debates."""
from alembic import op
import sqlalchemy as sa

revision = "0002_debate_messages"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "debate_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("debate_id", sa.Integer(), sa.ForeignKey("debates.id"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(length=30), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

def downgrade():
    op.drop_table("debate_messages")
