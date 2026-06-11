# import os
# from langchain_community.document_loaders import PyPDFLoader
# from langchain_text_splitters import RecursiveCharacterTextSplitter

# from langchain_huggingface import HuggingFaceEmbeddings
# from langchain_community.vectorstores import FAISS

from datetime import datetime
from uuid import UUID

from app.celery_app import celery_app
from db.database import SessionLocal

from models.document import (Document, DocumentStatus)
from models.task_tracker import (TaskTracker, TaskStatus)
from models.document_chunk import (DocumentChunk)
from models.document_embedding import (DocumentEmbedding)

from services.document_service import (
    save_embeddings,
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

def chunk_embedding(document, embedding_model, chunk_rows) :
        
        provider = get_embedding_provider(
            embedding_model
        )

        embeddings = []

        for chunk in chunk_rows:

            vector = provider.embed(
                chunk.content
            )

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
    3. 진행 상태 변경 - stage: EMBEDDIN
    4. DocumentChunk 조회 (input : document_id, output: list[DocumentChunk])
    5. embedding_model 값 확인
    6. get_embedding_provider(embedding_model) 호출
    7. chunk text를 vector로 변환
    8. DocumentEmbedding 테이블에 저장
    9. 진행률 업데이트
    10. Document 상태 변경
    11. 다음 단계 Summary Task 호출

    =====================================================
    """

    db = SessionLocal()

    try:

        """
        TODO
        1. Document 조회  -
        2. TaskTracker 조회  -
        3. 진행 상태 변경 - stage: EMBEDDIN  -
        4. DocumentChunk 조회 (input : document_id, output: list[DocumentChunk])
        5. embedding_model 값 확인 
        6. get_embedding_provider(embedding_model) 호출  -
        7. chunk text를 vector로 변환
        8. DocumentEmbedding 테이블에 저장
        9. 진행률 업데이트  -
        10. Document 상태 변경  -
        11. 다음 단계 Summ  ary Task 호출  x
        """

        # 1. Document 조회
        # 2. TaskTracer 조회

        document_uuid = UUID(document_id)
        task_uuid = UUID(task_id)

        document = db.query(Document).filter(Document.id == document_uuid).first()
        task = db.query(TaskTracker).filter(TaskTracker.id == task_uuid).first()

        # 3. 진행 상태 변경
        document.status = DocumentStatus.PROCESSING
        task.started_at = datetime.now()
        update_embedding_progress(
            db=db,
            task=task,
            progress=55,
            stage="EMBEDDING",
            message="문서를 chunk 단위로 분할하는 중입니다."
        )

        print("chunking")
        """
        steps = [
            (35, "OCR", "OCR로 텍스트를 추출하는 중입니다."),
            (55, "CHUNKING", "문서를 chunk 단위로 분할하는 중입니다."),
            (75, "EMBEDDING", "문서 임베딩을 생성하는 중입니다."),
            (90, "SUMMARY", "AI 요약을 생성하는 중입니다."),
        ]
        """

        # 4. DocumentChunk 조회 (input : document_id, output: list[DocumentChunk])
        chunks = split_text(
            document.ocr_markdown
        )

        chunk_rows = []

        for idx, chunk_text in enumerate(chunks):

            chunk_rows.append(
                DocumentChunk(
                    document_id=document.id,
                    chunk_index=idx,
                    content=chunk_text,
                )
            )

        db.add_all(chunk_rows)
        db.commit()
        db.flush()

        # 5. embedding_model 값 확인
        if embedding_model not in EMBEDDING_REGISTRY:
            embedding_model = EMBEDDING_REGISTRY[0]

        # 6. chunk text를 vector로 변환 
        embeddings = chunk_embedding(document, embedding_model, chunk_rows)

        print(type(embeddings))
        print(type(embeddings[0]))

        # 7. DocumentEmbedding 테이블에 저장
        save_embeddings(db, embeddings)

        # 8. 진행률 업데이트
        update_embedding_progress(
            db=db,
            task=task,
            progress=65,
            stage="EMBEDDING",
            message="문서 임베딩을 생성을 시작합니다."
        )

        # 9. 상태 변경
        task.progress = 75
        task.status = TaskStatus.PROCESSING
        task.stage="EMBEDDING_COMPLETED"
        task.message = "EMBEDDING 처리가 완료되었습니다."
        task.completed_at = datetime.now()

        document.status = DocumentStatus.PENDING
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

    finally:
        db.close()



@celery_app.task(name="tasks.embedding_tasks.process_retrieval")
def process_retrieval(document_id:str, task_id:str, input_question:str , embedding_model:str = "snowflake-ko", top_k:int = 5):

    db = SessionLocal()
    contents = []

    '''
    1. Document, task 조회
    2. 임베딩 모델 불러오기
    3. 입력 text 임베딩 변환
    4. db에서 현재 문서, 모델과 관련된 데이터 불러오기
    5. reranker모델 불러오기
    6. reranking

    '''
    try :
        # 1. Document, task 조회

        document_uuid = UUID(document_id)
        task_uuid = UUID(task_id)

        document = db.query(Document).filter(Document.id == document_uuid).first()
        task = db.query(TaskTracker).filter(TaskTracker.id == task_uuid).first()

        # 진행 상태 변경
        # document.status = DocumentStatus.PROCESSING
        # task.started_at = datetime.now()
        # update_embedding_progress(
        #     db=db,
        #     task=task,
        #     progress=80,
        #     stage="EMBEDDING",
        #     message="문서를 chunk 단위로 분할하는 중입니다."
        # )
        
        # # 2. 임베딩 모델 불러오기
        # if embedding_model not in EMBEDDING_REGISTRY:
        #     embedding_model = EMBEDDING_REGISTRY[0].base_model

        # provider = get_embedding_provider(
        #     embedding_model
        # )

        # # 3. 입력 text 임베딩 변환
        # vector_question = provider.embed(input_question)

        # # 4. db에서 현재 문서, 모델과 관련된 데이터 불러오기
        # chunks = get_document_retriver_data(db, document_id, embedding_model, vector_question, top_k * 2)

        chunks = retrieval(db, document_id, input_question, embedding_model, top_k * 2)

        # chunk_set = list(set(chunks) | set(chunks2))

        # 5. reranker
        rerank_chunks = reranking(chunks, input_question, "BAAI/bge-m3", top_k)

        contents = rerank_chunks

    except Exception as exc:
        print(exc)

    finally:
        db.close()


    return contents

def retrieval(db, document_id:int, input_question:str, embedding_model:str, top_k:int):
    provider = get_embedding_provider(embedding_model)

    vector_question = provider.embed(input_question)

    chunks = provider.search(db, document_id, embedding_model, vector_question, top_k)

    return chunks

def reranking(chunks, input_question:str , reranking_model:str = "BAAI/bge-m3", top_k:int = 5):
    rerank_chunks = []

    try :
        # 1. reranker 모델 불러오기
        reranker_model = reranking_model

        reranker = get_reranker_provider(
            reranker_model
        )

        # 2. reranking
        rerank_chunks = reranker.reranking(documents=chunks, text=input_question, top_k=top_k)

    except Exception as exc:
        print(exc)

    return rerank_chunks