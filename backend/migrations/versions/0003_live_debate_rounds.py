"""Persist live-debate round and phase metadata."""
from alembic import op
import sqlalchemy as sa
revision="0003_live_debate_rounds"
down_revision="0002_debate_messages"
branch_labels=None
depends_on=None
def upgrade():
    op.add_column("debate_messages", sa.Column("round_number", sa.Integer(), nullable=True))
    op.add_column("debate_messages", sa.Column("phase", sa.String(length=40), nullable=True))
def downgrade():
    op.drop_column("debate_messages","phase")
    op.drop_column("debate_messages","round_number")
