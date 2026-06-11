from celery import Celery
import os

from core.logging_config import get_logger, setup_logging
from app.celery_app import celery_app

import tasks.ocr_tasks
import tasks.summary_tasks
import tasks.embedding_tasks

setup_logging()
logger = get_logger(__name__)
logger.info("Celery worker application loading")

celery_app = Celery(
    "worker",
    broker=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/1"),
    include=["tasks.ocr_tasks", "tasks.embedding_tasks", "tasks.summary_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Seoul",
    enable_utc=False,
)

@celery_app.task
def test_task():
    return "celery is working"
