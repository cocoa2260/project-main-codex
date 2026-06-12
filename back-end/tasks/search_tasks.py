# chatbot을 통해 들어온 질문에 대한 답변 task 내용이 들어갈 파일
from app.celery_app import celery_app
from db.database import SessionLocal

from models.document import (Document, DocumentStatus)
from models.task_tracker import (TaskTracker, TaskStatus)

from ai.rerankers.reranking_factory import ( get_reranker_provider, RERANKING_REGISTRY )

from ai.embeddings.embedding_factory import (
    get_embedding_provider,
    EMBEDDING_REGISTRY
)

def embedding_retrieval(db, document_id:str, task_id:str, input_question:str , embedding_model:str = "snowflake-ko", top_k:int = 5):
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
        chunks = provider.search(db, document_id, vector_question, embedding_model, top_k * 2)

    except Exception as exc:
        print(exc)

    finally:
        db.close()


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
        rerank_chunks = reranker.reranking(documents=chunks, question=input_question, top_k=top_k)

    except Exception as exc:
        print(exc)

    return rerank_chunks



@celery_app.task(name="tasks.embedding_tasks.process_search_chunks")
def process_search_chunks(document_id:str, task_id:str, question:str, embedding_model:str = "snowflake-ko-lora", top_k:int = 5):

    db = SessionLocal()
    contents = []

    # embedding과 llm이 각각의 방식으로
    # 1. embeddingRetriever
    # 2. llm Retriever
    # 3. embedding Retriever + llm Retriever
    # 4. rerank(embed + llm)
    try:    

        # 1. embeddingRetriever
        chunks = embedding_retrieval(db, document_id, task_id, question, embedding_model, top_k*2)
        '''
        chunk 결과 = ['string', 'string', 'string']
        '''
        
        # 2. llm Retriever


        # 3. embedding Retriever + llm Retriever
        chunk_set = list(set(chunks) | set(chunks2))

        # 4. rerank(embed + llm)
        rerank_chunks = reranking(chunk_set, question, "BAAI/bge-m3", top_k)
        '''
        rerank_chunks 결과 = [('string', 유사도 float), ('string', 유사도 float)]
        '''

        contents = rerank_chunks

    except Exception as exc:
        print(exc)

    finally:
        db.close()


    return contents

