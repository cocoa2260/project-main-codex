from uuid import uuid4
import urllib.request

from db.database import SessionLocal

from models.document import Document, DocumentStatus
from models.task_tracker import TaskTracker, TaskStatus, TaskType

from tasks.embedding_tasks import process_document_embedding
from services.document_service import trigger_embedding_pipeline

from services.document_service import set_chunks


from models.user import User  # 있다고 가정

def create_dummy_data(db):
    user = User(
        id="dd8d3291-8755-4158-a1af-fee0a67aa42f",
        email="test@test.com",
        name="test user",
        password="1234",
        role="USER"
    )

    # db.add(user)
    # db.flush()  # 중요: commit 전에 PK 확보

    urllib.request.urlretrieve("https://raw.githubusercontent.com/lovit/soynlp/master/tutorials/2016-10-20.txt", filename="2016-10-20.txt")

    with open("2016-10-20.txt", encoding="utf-8") as f:
        file = f.read()

    print("test : " , len(file))

    document = Document(
        id=uuid4(),
        user_id=user.id,
        file_name="test.pdf",
        storage_path="/tmp/test.pdf",
        file_size=12345,
        page_count=1,
        category="test",
        ocr_markdown=file[20000:30000],
        selected_embedding_model="snowflake-ko-lora",
    )

    task = TaskTracker(
        id=uuid4(),
        document_id=document.id,
        status="PENDING",
        progress=0,
        stage="INIT",
        message="init",
        task_type=TaskType.OCR,

    )

    db.add(document)
    db.add(task)
    db.commit()

    return document, task


def run_test():
    db = SessionLocal()

    try:
        document, task = create_dummy_data(db)

        print("[TEST] document:", document.id)
        print("[TEST] task:", task.id)

        set_chunks(db, document.id, document.ocr_markdown)

        result = trigger_embedding_pipeline(
            db,
            document
        )

        print("\n===== RESULT =====")
        print(result)

        updated_doc = db.query(Document).filter(Document.id == document.id).first()
        updated_task = db.query(TaskTracker).filter(TaskTracker.id == result.id).first()

        print("\n===== DB STATE =====")
        print("document status:", updated_doc.status)
        print("task status:", updated_task.status)
        print("task progress:", updated_task.progress)

        print("\nembeddings count:", len(updated_doc.embeddings))

    except Exception as e:
        print("[ERROR]", e)
        db.rollback()

    finally:
        db.close()


if __name__ == "__main__":
    run_test()

# from uuid import uuid4
# import urllib.request

# from db.database import SessionLocal

# from models.document import Document
# from models.document_chunk import DocumentChunk
# from models.document_embedding import DocumentEmbedding
# from models.user import User

# from tasks.search_tasks import process_search_chunks


# def create_dummy_retrieval_data(db):
#     # --------------------------
#     # 1. User
#     # --------------------------
#     user = User(
#         id="6e1c1869-c5af-42a1-a14d-2f3048c3adca",
#         email="test@test.com",
#         name="test user",
#         password="1234",
#         role="USER"
#     )

#     # db.add(user)

#     # --------------------------
#     # 2. Dummy text
#     # --------------------------
#     urllib.request.urlretrieve(
#         "https://raw.githubusercontent.com/lovit/soynlp/master/tutorials/2016-10-20.txt",
#         filename="2016-10-20.txt"
#     )

#     with open("2016-10-20.txt", encoding="utf-8") as f:
#         file = f.read()

#     # --------------------------
#     # 3. Document
#     # --------------------------
#     document = Document(
#         id="a60500c3-0a5a-438c-bdf1-cb840d70db04",
#         user_id=user.id,
#         file_name="test.pdf",
#         storage_path="/tmp/test.pdf",
#         file_size=12345,
#         page_count=1,
#         category="test",
#         ocr_markdown=file[20000:21000],
#         selected_embedding_model="snowflake-ko",
#     )

#     task = TaskTracker(
#         id=uuid4(),
#         document_id=document.id,
#         status="PENDING",
#         progress=0,
#         stage="INIT",
#         message="init",
#         task_type=TaskType.EMBEDDING,

#     )

#     db.add(task)
#     db.commit()

#     return document, task

# def run_test():
#     db = SessionLocal()

#     try:
#         document, task = create_dummy_retrieval_data(db)

#         print("\n[TEST] document:", document.id)

#         # --------------------------
#         # 5. Retrieval 실행
#         # --------------------------
#         query = "pgvector는 뭐야?"

#         result = process_search_chunks(
#             document_id=document.id,
#             task_id=str(task.id),
#             question=query,
#             embedding_model="snowflake-ko-lora",
#             top_k=5,
#         )
        
#         print("\n===== RETRIEVAL RESULT =====")
#         print(result)

#     except Exception as e:
#         print("[ERROR]", e)
#         db.rollback()

#     finally:
#         db.close()


# if __name__ == "__main__":
#     run_test()