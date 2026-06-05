"""
Database Migration: Add Performance Indexes
Target: Improve portfolio and position query performance.

Migration ID: 001
Date: 2025-06-05
Author: Backend Engineer
Status: Draft (for testing in Week 1)

Indexes added:
  1. idx_portfolio_user_id — speeds up portfolio lookups by user
  2. idx_position_portfolio_id — speeds up position lookups by portfolio
  3. idx_position_ticker — speeds up position lookups by ticker (for filtering)

Note: User email index already exists (created by model definition).

Expected impact:
  - Portfolio reads: ~20-30% faster
  - Position reads: ~15-25% faster
  - Backtest: <5% impact (doesn't use DB)
  - Write overhead: minimal (SQLAlchemy handles insert/update efficiently)
"""

from sqlalchemy import text, inspect
from sqlalchemy.engine import Engine


def check_index_exists(engine: Engine, table_name: str, index_name: str) -> bool:
    """Check if an index already exists."""
    inspector = inspect(engine)
    existing_indexes = {idx["name"] for idx in inspector.get_indexes(table_name)}
    return index_name in existing_indexes


def upgrade(engine: Engine) -> None:
    """Apply database indexes."""
    with engine.begin() as connection:
        # Index 1: portfolios.user_id
        if not check_index_exists(engine, "portfolios", "idx_portfolio_user_id"):
            connection.execute(
                text("CREATE INDEX idx_portfolio_user_id ON portfolios(user_id)")
            )
            print("✅ Created index: idx_portfolio_user_id")
        else:
            print("⏭️  Index already exists: idx_portfolio_user_id")

        # Index 2: positions.portfolio_id
        if not check_index_exists(engine, "positions", "idx_position_portfolio_id"):
            connection.execute(
                text("CREATE INDEX idx_position_portfolio_id ON positions(portfolio_id)")
            )
            print("✅ Created index: idx_position_portfolio_id")
        else:
            print("⏭️  Index already exists: idx_position_portfolio_id")

        # Index 3: positions.ticker
        if not check_index_exists(engine, "positions", "idx_position_ticker"):
            connection.execute(
                text("CREATE INDEX idx_position_ticker ON positions(ticker)")
            )
            print("✅ Created index: idx_position_ticker")
        else:
            print("⏭️  Index already exists: idx_position_ticker")


def downgrade(engine: Engine) -> None:
    """Rollback database indexes."""
    with engine.begin() as connection:
        # Drop in reverse order
        for index_name in [
            "idx_position_ticker",
            "idx_position_portfolio_id",
            "idx_portfolio_user_id",
        ]:
            try:
                connection.execute(text(f"DROP INDEX IF EXISTS {index_name}"))
                print(f"✅ Dropped index: {index_name}")
            except Exception as e:
                print(f"⚠️  Could not drop {index_name}: {e}")


def run_migration(engine: Engine, direction: str = "upgrade") -> None:
    """Execute migration in specified direction."""
    if direction == "upgrade":
        upgrade(engine)
    elif direction == "downgrade":
        downgrade(engine)
    else:
        raise ValueError(f"Unknown direction: {direction}")


if __name__ == "__main__":
    """
    Standalone execution for testing.
    Usage: python migrations/001_add_database_indexes.py
    """
    import sys
    sys.path.insert(0, "/".join(sys.argv[0].split("/")[:-2]))

    from app.core.database import engine

    print("=" * 70)
    print("Migration 001: Add Database Indexes")
    print("=" * 70)

    run_migration(engine, direction="upgrade")

    print("\n✅ Migration completed successfully")
