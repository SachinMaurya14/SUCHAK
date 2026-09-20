"""
SUCHAK Seed Data Runner
Phase 2 Persistence Architecture
"""
import sys
import logging
from backend.app.core.database import db_session, engine
from backend.app.models.base import Base
from backend.app.seeds.seed_data import seed_database

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("suchak.seeds")

def run():
    logger.info("Starting SUCHAK controlled demonstration seeding...")
    # Ensure tables exist in target database
    Base.metadata.create_all(bind=engine)
    with db_session() as session:
        summary = seed_database(session)
        logger.info("Seeding completed successfully:")
        for k, v in summary.items():
            logger.info(" - %s: %d created", k, v)

if __name__ == "__main__":
    run()
