from celery import Celery
from os import getenv

celery_app = Celery(
    "document_ai",
    broker=getenv("CELERY_BROKER_URL"),
    backend=getenv("CELERY_RESULT_BACKEND"),
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Seoul",
    enable_utc=False,
)