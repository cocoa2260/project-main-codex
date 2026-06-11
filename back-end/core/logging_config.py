import logging
import os
from logging.config import dictConfig


DEFAULT_LOG_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(name)s | "
    "%(filename)s:%(lineno)d | %(message)s"
)


def setup_logging() -> None:
    """
    Backend / Celery 공통 logging 설정.

    사용 방법:
    - FastAPI 시작 시 main.py에서 1회 호출
    - Celery worker 시작 시 app/worker.py에서 1회 호출

    환경변수:
    - LOG_LEVEL=DEBUG | INFO | WARNING | ERROR
    """
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()

    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": DEFAULT_LOG_FORMAT,
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "level": log_level,
                },
            },
            "root": {
                "handlers": ["console"],
                "level": log_level,
            },
            "loggers": {
                "uvicorn": {"level": log_level, "handlers": ["console"], "propagate": False},
                "uvicorn.error": {"level": log_level, "handlers": ["console"], "propagate": False},
                "uvicorn.access": {"level": log_level, "handlers": ["console"], "propagate": False},
                "celery": {"level": log_level, "handlers": ["console"], "propagate": False},
                "sqlalchemy.engine": {
                    "level": os.getenv("SQLALCHEMY_LOG_LEVEL", "WARNING").upper(),
                    "handlers": ["console"],
                    "propagate": False,
                },
            },
        }
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
