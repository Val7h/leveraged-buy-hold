"""
Migration runner for Sprint 1 Week 2
Applies database indexes migration and measures impact
"""
import sys
import os
import logging
import importlib.util

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    logger.info("=" * 70)
    logger.info("SPRINT 1 WEEK 2 — DATABASE MIGRATION: Add Indexes")
    logger.info("=" * 70)

    try:
        logger.info("\nApplying migration 001_add_database_indexes...")

        # Load the migration module dynamically
        migration_path = os.path.join(os.path.dirname(__file__), "migrations/001_add_database_indexes.py")
        spec = importlib.util.spec_from_file_location("migration_001", migration_path)
        migration_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration_module)

        # Run the migration
        migration_module.run_migration(engine, direction="upgrade")
        logger.info("\n[SUCCESS] Migration applied successfully")
        logger.info("=" * 70)
        return 0
    except Exception as e:
        logger.error(f"\n[FAILED] Migration failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        logger.error("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
