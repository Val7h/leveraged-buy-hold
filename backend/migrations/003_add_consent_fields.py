"""Add consent tracking fields to users table"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('users', sa.Column('risk_acknowledged', sa.Boolean, default=False))
    op.add_column('users', sa.Column('terms_accepted', sa.Boolean, default=False))
    op.add_column('users', sa.Column('consent_logged_at', sa.DateTime, nullable=True))

def downgrade():
    op.drop_column('users', 'risk_acknowledged')
    op.drop_column('users', 'terms_accepted')
    op.drop_column('users', 'consent_logged_at')
