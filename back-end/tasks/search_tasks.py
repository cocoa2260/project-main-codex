# chatbot을 통해 들어온 질문에 대한 답변 task 내용이 들어갈 파일

import re
from app.celery_app import celery_app
from core.config import settings

from sqlalchemy.orm import Session

from models.document import (Document, DocumentStatus)
from models.document_chunk import DocumentChunk
from models.task_tracker import (TaskTracker, TaskStatus)

from ai.llms.llm_factory import get_llm_provider
from ai.rerankers.reranking_factory import ( get_reranker_provider, RERANKING_REGISTRY )

from ai.embeddings.embedding_factory import (
    get_embedding_provider,
    EMBEDDING_REGISTRY
)


def normalize_keyword(keyword: str) -> str:
    return (keyword or "").strip().lower().replace(" ", "")


def keyword_match_score(question_keywords: list[str], chunk_keywords: list[str]) -> int:
    score = 0
    normalized_question_keywords = [
        normalize_keyword(keyword)
        for keyword in question_keywords
        if normalize_keyword(keyword)
    ]
    normalized_chunk_keywords = [
        normalize_keyword(keyword)
        for keyword in chunk_keywords
        if normalize_keyword(keyword)
    ]
    for question_keyword in normalized_question_keywords:
        for chunk_keyword in normalized_chunk_keywords:
            if question_keyword == chunk_keyword:
                score += 3
            elif question_keyword in chunk_keyword or chunk_keyword in question_keyword:
                score += 1

    return score


def keyword_retrieval(db, document_id: str, question: str, top_k: int = 5) -> list[str]:
    """
    LLM으로 질문 키워드를 추출한 뒤 document_chunks.keywords와 비교해
    전체 문서에서 관련 chunk.content를 embedding_retrieval과 같은 list[str] 형태로 반환한다.

    document_id는 기존 호출부와의 호환성을 위해 유지한다.
    """
    try:
        llm_provider = get_llm_provider(settings.DEFAULT_LLM_MODEL)
        question_keywords = llm_provider.extract_question_keywords(question)

        if not question_keywords:
            return []

        chunk_rows = (
            db.query(DocumentChunk, Document.file_name)
            .join(Document, Document.id == DocumentChunk.document_id)
            .order_by(DocumentChunk.chunk_index.asc())
            .all()
        )

        scored_chunks = []

        
        for chunk in chunk_rows:
            score = keyword_match_score(question_keywords, chunk[0].keywords or [])
            if score > 0:
                scored_chunks.append((score, chunk[0].content, chunk[1]))

        scored_chunks.sort(key=lambda row: (-row[0], row[1]))
        return [{'content': content, 'file_name': file_name} for _, content, file_name in scored_chunks[:top_k]]

    except Exception as exc:
        print(exc)
        return []


def normalize_chunk_content(text: str) -> str:
    # 메타데이터 제거
    # [page=1], [chunk=3], [source=xxx] 같은 형태 제거
    text = re.sub(r"\[.*?\]", "", text)

    # 보이지 않는 문자 제거
    text = re.sub(r"[\u200b\xa0]", "", text)

    # 공백 통합
    text = re.sub(r"\s+", " ", text)

    # 특수문자 제거
    text = re.sub(r"[^\w가-힣]", "", text)

    return text.lower().strip()


def merge_retrieved_chunks(*chunk_lists: list[dict]) -> list[dict]:
    merged_chunks = []
    seen = set()

    for chunks in chunk_lists:
        for chunk in chunks or []:

            content = chunk.get("content")

            if not content:
                continue

            normalized = normalize_chunk_content(content)

            if normalized in seen:
                continue

            seen.add(normalized)
            merged_chunks.append(chunk)

    return merged_chunks

def embedding_retrieval(db, document_id:str, task_id:str, input_question:str , embedding_model:str = "snowflake-ko-lora", top_k:int = 5):
    chunks = []

    '''
    1. Document, task 조회
    2. 진행 상태 변경
    3. embedding_model 값 확인
    4. embedding model 불러오기
    5. question vector로 변환
    6. db에서 question vector 유사도 기반 추출
    '''
    try :
        # 1. Document, task 조회

        # document_uuid = UUID(document_id)
        # task_uuid = UUID(task_id)

        # document = db.query(Document).filter(Document.id == document_uuid).first()
        # task = db.query(TaskTracker).filter(TaskTracker.id == task_uuid).first()

        # 2. 진행 상태 변경
        # document.status = DocumentStatus.PROCESSING
        # task.started_at = datetime.now()
        # update_embedding_progress(
        #     db=db,
        #     task=task,
        #     progress=80,
        #     stage="EMBEDDING",
        #     message="문서를 chunk 단위로 분할하는 중입니다."
        # )

        # 3. embedding_model 값 확인
        if embedding_model not in EMBEDDING_REGISTRY:
            embedding_model = next(iter(EMBEDDING_REGISTRY))

        # 4. embedding model 불러오기
        provider = get_embedding_provider(embedding_model)

        # 5. question vector로 변환
        vector_question = provider.embed(input_question)

        # 6. db에서 question vector 유사도 기반 추출
        chunks = provider.search(db, document_id, vector_question, embedding_model, top_k)

    except Exception as exc:
        print(exc)

    finally:
        db.close()


    return chunks

def reranking(chunks, input_question:str , reranking_model:str = "BAAI/bge-reranker-m3", top_k:int = 5):
    rerank_chunks = []

    try :
        # 1. reranker 모델 불러오기

        reranker = get_reranker_provider(
            reranking_model
        )

        # 2. reranking
        rerank_chunks = reranker.reranking(documents=chunks, question=input_question, top_k=top_k)

    except Exception as exc:
        print(exc)

    return rerank_chunks



@celery_app.task(name="tasks.embedding_tasks.process_search_chunks")
def process_search_chunks(db: Session, document_id:str, task_id:str, question:str, embedding_model:str = "snowflake-ko-lora", top_k:int = 5):
    contents = []

    # embedding과 llm이 각각의 방식으로
    # 1. embeddingRetriever
    # 2. llm Retriever
    # 3. embedding Retriever + llm Retriever
    # 4. rerank(embed + llm)
    try:    
        
        # question = summary_question(question)

        # 1. embeddingRetriever
        chunks = embedding_retrieval(db, document_id, task_id, question, embedding_model, top_k*2)

        # 2. llm Retriever
        chunks2 = keyword_retrieval(db, document_id, question, top_k*2)
        '''
        chunk 결과 = [{'content': content, 'file_name': file_name}, {'content': content, 'file_name': file_name}, ...]
        '''
        # chunks2 = []

        # 3. embedding Retriever + llm Retriever
        chunk_set = merge_retrieved_chunks(chunks, chunks2)

        # 4. rerank(embed + llm)
        rerank_chunks = reranking(chunk_set, question, "BAAI/bge-reranker-m3", top_k)
        '''
        rerank_chunks 결과 = [({'content': content, 'file_name': file_name}, 유사도 float), ...]
        '''

        contents = rerank_chunks

    except Exception as exc:
        print(exc)

    finally:
        db.close()


    return contents

def summary_question(question:str):
    llm_provider = get_llm_provider(settings.DEFAULT_LLM_MODEL)
    return llm_provider.summarize_question(question)
