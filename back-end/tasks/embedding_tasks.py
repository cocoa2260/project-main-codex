from datetime import datetime
from uuid import UUID

from app.celery_app import celery_app
from db.database import SessionLocal

from models.document import (Document, DocumentStatus)
from models.task_tracker import (TaskStage, TaskTracker, TaskStatus)
from models.document_chunk import (DocumentChunk)
from models.document_embedding import (DocumentEmbedding)

from services.document_service import (
    save_embeddings,
    get_chunks
)

from utils.text_chunk import (split_text)

# 임베딩 모델 호출
from ai.embeddings.embedding_factory import (
    get_embedding_provider,
    EMBEDDING_REGISTRY
)

from ai.rerankers.reranking_factory import ( get_reranker_provider, RERANKING_REGISTRY )

def update_embedding_progress(db, task, progress, stage, message):
    task.status = TaskStatus.PROCESSING
    task.progress = progress
    task.stage = stage
    task.message = message
    db.commit()

    '''
    steps = [
            (25, "CHUNKING", "Markdown 문서를 chunk 단위로 분할하는 중입니다."),
            (50, "EMBEDDING", f"{document.selected_embedding_model} 모델로 임베딩을 생성하는 중입니다."),
            (80, "SAVE", "임베딩 결과를 저장 중입니다."),
        ]
    '''

def chunk_embedding(document, embedding_model, chunk_rows) :
    '''
    1. 임베딩 모델 불러오기
    2. Chunk를 vector 값으로 변환
    3. DB에 변환된 vector 저장
    '''

    # 1. 임베딩 모델 불러오기
    provider = get_embedding_provider(
        embedding_model
    )

    embeddings = []

    for chunk in chunk_rows:
        # 2. Chunk를 vector 값으로 변환
        vector = provider.embed(
            chunk.content
        )

        # 3. DB에 변환된 vector 저장
        embeddings.append(
            DocumentEmbedding(
                document_id=document.id,
                chunk_id=chunk.id,   # UUID
                embedding_model=embedding_model,
                embedding_dimension=len(vector),
                embedding=vector,
            )
        )
    
    return embeddings

@celery_app.task(name="tasks.embedding_tasks.process_document_embedding")
def process_document_embedding(document_id:str, task_id:str, embedding_model:str = "snowflake-ko-lora"):

    """
    =====================================================
    Embedding 파이프라인
    =====================================================

    input:
        document_id
        task_id
        embedding_model

    구현 순서:
    1. Document 조회
    2. TaskTracker 조회
    3. 진행률 업데이트
    4. DocumentChunk 조회 (input : document_id, output: list[DocumentChunk])
    5. embedding_model 값 확인
    6. 진행률 업데이트
    7. 임베딩 시작 - chunk text를 vector로 변환 
    8. 임베딩 결과 저장
    9. 진행률 업데이트

    =====================================================
    """

    db = SessionLocal()

    try:
        # 1. Document 조회
        # 2. TaskTracer 조회
        document_uuid = UUID(document_id)
        task_uuid = UUID(task_id)

        document = db.query(Document).filter(Document.id == document_uuid).first()
        task = db.query(TaskTracker).filter(TaskTracker.id == task_uuid).first()

        # 3. 진행률 업데이트
        document.status = DocumentStatus.PROCESSING
        task.started_at = datetime.now()
        update_embedding_progress(
            db=db,
            task=task,
            progress=25,
            stage=TaskStage.CHUNKING_PROCESSING,
            message="문서를 chunk 단위로 분할하는 중입니다."
        )

        # 4. DocumentChunk 조회
        chunk_rows = get_chunks(db=db, document_id=document_id)

        # 5. embedding_model 값 확인
        if embedding_model not in EMBEDDING_REGISTRY:
            embedding_model = EMBEDDING_REGISTRY[0]

        update_embedding_progress(
            db=db,
            task=task,
            progress=50,
            stage="EMBEDDING",
            message=f"{document.selected_embedding_model} 모델로 임베딩을 생성하는 중입니다."
        )

        # 6. 진행률 업데이트
        update_embedding_progress(
            db=db,
            task=task,
            progress=65,
            stage=TaskStage.EMBEDDING_PROCESSING,
            message="문서 임베딩 생성을 시작합니다."
        )
        
        # 7. chunk text를 vector로 변환 
        embeddings = chunk_embedding(document, embedding_model, chunk_rows)

        # 8. DocumentEmbedding 테이블에 저장
        save_embeddings(db, embeddings)

        # 9. 상태 변경
        task.progress = 75
        task.status = TaskStatus.PROCESSING
        task.stage=TaskStage.EMBEDDING_COMPLETED
        task.message = "EMBEDDING 처리가 완료되었습니다."
        task.completed_at = datetime.now()

        document.status = DocumentStatus.PROCESSING
        document.process_at = datetime.now()
        
        db.commit()

        return {
            "document_id": document_id,
            "task_id": task_id,
            "embedding_model": embedding_model,
            "status": "COMPLETED"
        }
    except Exception as exc:
        db.rollback()
        print(exc)
        raise

    finally:
        db.close()
