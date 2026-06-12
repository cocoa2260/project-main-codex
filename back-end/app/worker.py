from core.logging_config import get_logger, setup_logging
from app.celery_app import celery_app

import tasks.ocr_tasks
import tasks.summary_tasks
import tasks.embedding_tasks

setup_logging()
logger = get_logger(__name__)
logger.info("Celery worker application loading")


@celery_app.task
def test_task():
    return "celery is working"
