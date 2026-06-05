"""
Migration runner for Sprint 1 Week 2
Applies database indexes migration and measures impact
"""
import sys
import os
import logging

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from migrations import f001_add_database_indexes

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
        f001_add_database_indexes.run_migration(engine, direction="upgrade")
        logger.info("\n[SUCCESS] Migration applied successfully")
        logger.info("=" * 70)
        return 0
    except Exception as e:
        logger.error(f"\n[FAILED] Migration failed: {e}")
        logger.error("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
