"""
Pipeline status/stage common code definitions.

DB common code table stores these values for admin/display use.
Application code imports this file to avoid hard-coded status/stage strings.
"""


class CodeGroup:
    DOCUMENT_STATUS = "DOCUMENT_STATUS"
    TASK_STATUS = "TASK_STATUS"
    TASK_TYPE = "TASK_TYPE"
    TASK_STAGE = "TASK_STAGE"


class DocumentStatusCode:
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class TaskStatusCode:
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class TaskTypeCode:
    OCR = "OCR"
    SUMMARY = "SUMMARY"
    EMBEDDING = "EMBEDDING"
    RAG_INDEXING = "RAG_INDEXING"


class TaskStageCode:
    UPLOAD_COMPLETED = "UPLOAD_COMPLETED"
    OCR_PENDING = "OCR_PENDING"
    OCR_PROCESSING = "OCR_PROCESSING"
    OCR_COMPLETED = "OCR_COMPLETED"
    MARKDOWN_REVIEW = "MARKDOWN_REVIEW"
    SUMMARY_PENDING = "SUMMARY_PENDING"
    CHUNKING_PROCESSING = "CHUNKING_PROCESSING"
    CHUNKING_COMPLETED = "CHUNKING_COMPLETED"
    EMBEDDING_PROCESSING = "EMBEDDING_PROCESSING"
    EMBEDDING_COMPLETED = "EMBEDDING_COMPLETED"
    SUMMARY_PROCESSING = "SUMMARY_PROCESSING"
    SUMMARY_COMPLETED = "SUMMARY_COMPLETED"
    RAG_INDEXING = "RAG_INDEXING"
    RAG_READY = "RAG_READY"
    FAILED = "FAILED"


COMMON_CODE_SEEDS = [
    # Document status
    (CodeGroup.DOCUMENT_STATUS, DocumentStatusCode.PENDING, "대기 중", "문서가 등록되고 작업 대기 중입니다.", 10),
    (CodeGroup.DOCUMENT_STATUS, DocumentStatusCode.PROCESSING, "처리 중", "문서 처리 파이프라인이 진행 중입니다.", 20),
    (CodeGroup.DOCUMENT_STATUS, DocumentStatusCode.REVIEW_REQUIRED, "리뷰 필요", "OCR/Markdown 결과 검토가 필요합니다.", 30),
    (CodeGroup.DOCUMENT_STATUS, DocumentStatusCode.COMPLETED, "완료", "문서 처리 및 요약이 완료되었습니다.", 40),
    (CodeGroup.DOCUMENT_STATUS, DocumentStatusCode.FAILED, "실패", "문서 처리 중 오류가 발생했습니다.", 50),
    # Task status
    (CodeGroup.TASK_STATUS, TaskStatusCode.PENDING, "대기 중", "작업이 대기 중입니다.", 10),
    (CodeGroup.TASK_STATUS, TaskStatusCode.PROCESSING, "처리 중", "작업이 진행 중입니다.", 20),
    (CodeGroup.TASK_STATUS, TaskStatusCode.COMPLETED, "완료", "작업이 완료되었습니다.", 30),
    (CodeGroup.TASK_STATUS, TaskStatusCode.FAILED, "실패", "작업이 실패했습니다.", 40),
    # Task type
    (CodeGroup.TASK_TYPE, TaskTypeCode.OCR, "OCR", "OCR/Markdown 변환 작업", 10),
    (CodeGroup.TASK_TYPE, TaskTypeCode.SUMMARY, "요약", "Chunking/Embedding/LLM 요약 작업", 20),
    (CodeGroup.TASK_TYPE, TaskTypeCode.EMBEDDING, "임베딩", "문서 임베딩 생성 작업", 30),
    (CodeGroup.TASK_TYPE, TaskTypeCode.RAG_INDEXING, "RAG 인덱싱", "RAG 검색 인덱스 생성 작업", 40),
    # Task stage
    (CodeGroup.TASK_STAGE, TaskStageCode.UPLOAD_COMPLETED, "업로드 완료", "파일 업로드가 완료되었습니다.", 10),
    (CodeGroup.TASK_STAGE, TaskStageCode.OCR_PENDING, "OCR 대기", "OCR 작업 대기 중입니다.", 20),
    (CodeGroup.TASK_STAGE, TaskStageCode.OCR_PROCESSING, "OCR 처리 중", "OCR로 텍스트를 추출하고 있습니다.", 30),
    (CodeGroup.TASK_STAGE, TaskStageCode.OCR_COMPLETED, "OCR 완료", "OCR/Markdown 변환이 완료되었습니다.", 40),
    (CodeGroup.TASK_STAGE, TaskStageCode.MARKDOWN_REVIEW, "Markdown 리뷰", "사용자 Markdown 검토가 필요합니다.", 50),
    (CodeGroup.TASK_STAGE, TaskStageCode.SUMMARY_PENDING, "요약 대기", "요약/임베딩 작업 대기 중입니다.", 60),
    (CodeGroup.TASK_STAGE, TaskStageCode.CHUNKING_PROCESSING, "Chunking 처리 중", "Markdown 문서를 chunk 단위로 분할하고 있습니다.", 70),
    (CodeGroup.TASK_STAGE, TaskStageCode.CHUNKING_COMPLETED, "Chunking 완료", "Chunking 작업이 완료되었습니다.", 80),
    (CodeGroup.TASK_STAGE, TaskStageCode.EMBEDDING_PROCESSING, "Embedding 처리 중", "문서 임베딩을 생성하고 있습니다.", 90),
    (CodeGroup.TASK_STAGE, TaskStageCode.EMBEDDING_COMPLETED, "Embedding 완료", "문서 임베딩 생성이 완료되었습니다.", 100),
    (CodeGroup.TASK_STAGE, TaskStageCode.SUMMARY_PROCESSING, "요약 처리 중", "AI 요약을 생성하고 있습니다.", 110),
    (CodeGroup.TASK_STAGE, TaskStageCode.SUMMARY_COMPLETED, "요약 완료", "AI 요약 생성이 완료되었습니다.", 120),
    (CodeGroup.TASK_STAGE, TaskStageCode.RAG_INDEXING, "RAG 인덱싱 중", "RAG 검색 인덱스를 생성하고 있습니다.", 130),
    (CodeGroup.TASK_STAGE, TaskStageCode.RAG_READY, "RAG 준비 완료", "문서 기반 질의응답 준비가 완료되었습니다.", 140),
    (CodeGroup.TASK_STAGE, TaskStageCode.FAILED, "실패", "작업 단계 처리 중 오류가 발생했습니다.", 900),
]
