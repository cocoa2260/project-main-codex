from datetime import datetime
from time import sleep
from uuid import UUID

from app.celery_app import celery_app
from db.database import SessionLocal
from models.document import Document, DocumentStatus
from models.task_tracker import TaskTracker, TaskStatus

from utils.extract_file import extract_native_blocks, extract_image_regions, render_clip, extract_ocr_blocks_from_image, sort_blocks, classify_block_type
from utils.converter import block_to_markdown

import pymupdf

def update_task_progress(
    db,
    task: TaskTracker,
    status: str,
    progress: int,
    stage: str,
    message: str,
):
    task.status = status
    task.progress = progress
    task.stage = stage
    task.message = message
    db.commit()

@celery_app.task(name="tasks.ocr_tasks.process_document_ocr")
def process_document_ocr(document_id: str, task_id: str):
    """
    문서 OCR 파이프라인 진입점.

    현재는 팀원이 구현 중인 OCR / Chunking / Embedding / Summary 코드를
    나중에 붙이기 위한 껍데기 task다.

    TODO 연결 위치:
    1. PDF 텍스트/이미지 영역 분리
    2. OCR 처리
    3. DocumentPage 저장
    4. Chunking
    5. Embedding
    6. Summary 생성
    """
    db = SessionLocal()

    try:
        document_uuid = UUID(document_id)
        task_uuid = UUID(task_id)

        document = db.query(Document).filter(Document.id == document_uuid).first()
        task = db.query(TaskTracker).filter(TaskTracker.id == task_uuid).first()

        if document is None or task is None:
            return {
                "document_id": document_id,
                "task_id": task_id,
                "status": "FAILED",
                "error": "document or task not found",
            }

        
        document.status = DocumentStatus.PROCESSING
        task.started_at = datetime.now()

        update_task_progress(
            db=db,
            task=task,
            status=TaskStatus.PROCESSING,
            progress=5,
            stage="READY",
            message="문서 처리 작업을 시작합니다.",
        )
        """
        steps = [
            (15, "PDF_ANALYSIS", "PDF 문서 구조를 분석하는 중입니다."),
            (35, "OCR", "OCR로 텍스트를 추출하는 중입니다."),
            (55, "CHUNKING", "문서를 chunk 단위로 분할하는 중입니다."),
            (75, "EMBEDDING", "문서 임베딩을 생성하는 중입니다."),
            (90, "SUMMARY", "AI 요약을 생성하는 중입니다."),
        ]
        """

        sleep(1)
        update_task_progress(
            db=db,
            task=task,
            status=TaskStatus.PROCESSING,
            progress=15,
            stage="PDF_ANALYSIS",
            message="PDF 문서 구조를 분석하는 중입니다.",
        )

        sleep(1)
        update_task_progress(
            db=db,
            task=task,
            status=TaskStatus.PROCESSING,
            progress=25,
            stage="OCR",
            message="OCR로 텍스트를 추출하는 중입니다.",
        )

        pdf_path = document.storage_path
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        ocr_result = run_ocr_pipeline_stub(pdf_bytes)

        # OCR 결과 Markdown 저장 후 Review 단계로 전환한다.
        document.ocr_markdown = ocr_result
        document.status = DocumentStatus.REVIEW_REQUIRED
        document.process_at = datetime.now()

        task.progress = 100
        task.status = TaskStatus.COMPLETED
        task.stage = "MARKDOWN_REVIEW"
        task.message = "Markdown 변환이 완료되었습니다. 검토 후 요약 진행 여부를 선택해주세요."
        task.completed_at = datetime.now()

        db.commit()

        return {
            "document_id": document_id,
            "task_id": task_id,
            "status": "REVIEW_REQUIRED",
            "markdown_length": len(ocr_result or ""),
        }

    except Exception as exc:
        db.rollback()

        try:
            task = db.query(TaskTracker).filter(TaskTracker.id == UUID(task_id)).first()
            document = db.query(Document).filter(Document.id == UUID(document_id)).first()

            if task:
                task.status = TaskStatus.FAILED
                task.stage = "FAILED"
                task.message = "문서 처리 중 오류가 발생했습니다."
                task.error_message = str(exc)
                task.completed_at = datetime.now()

            if document:
                document.status = DocumentStatus.FAILED

            db.commit()
        except Exception:
            db.rollback()

        raise

    finally:
        db.close()


# 기존 이미지 영역 OCR 테스트 task는 유지한다.
@celery_app.task(name="tasks.ocr_tasks.ocr_image_area")
def ocr_image_area(image_path: str, page_no: int, image_no: int):
    import os

    import pytesseract
    from PIL import Image

    if not os.path.exists(image_path):
        return {
            "page_no": page_no,
            "image_no": image_no,
            "image_path": image_path,
            "error": "이미지 파일이 존재하지 않습니다.",
        }

    image = Image.open(image_path)
    text = pytesseract.image_to_string(image, lang="kor+eng")

    return {
        "page_no": page_no,
        "image_no": image_no,
        "image_path": image_path,
        "ocr_text": text.strip(),
    }

def run_ocr_pipeline_stub(document: bytes):
    """
    팀원 OCR 파이프라인 연결 예정 지점.

    반환 contract:

    {
        "page_count": 10,
        "pages": [
            {
                "page_no": 1,
                "text": "페이지 전체 텍스트",
                "blocks": [
                    {
                        "type": "paragraph",
                        "text": "문단 텍스트",
                        "bbox": [0, 0, 100, 100]
                    },
                    {
                        "type": "table",
                        "text": "표 텍스트",
                        "bbox": [0, 120, 300, 300]
                    }
                ]
            }
        ]
    }
    """

    doc_text_result = ""

    doc = pymupdf.open(
        stream=document,
        filetype="pdf"
    )

    for page_idx, page in enumerate(doc):
        page_number = page_idx + 1

        # if page_idx < 3 or page_idx > 4:
        #     continue

        print(f"\n===== PAGE {page_number} =====")
        
        # =========================
        # 1. native text 추출
        # =========================
        # PDF 내부에 텍스트 객체로 들어있는 글자를 추출한다.
        native_blocks = extract_native_blocks(
            page
        )

        print("native:", len(native_blocks))

        # =========================
        # 2. image block 영역 추출
        # =========================
        # PDF 안에 포함된 이미지 영역만 가져온다.
        image_regions = extract_image_regions(
            page
        )

        print("image regions:", len(image_regions))

        # =========================
        # 3. 이미지 영역별 OCR 실행
        # =========================
        ocr_blocks = []

        for region in image_regions:
            try:
                # PDF 좌표계 기준 image bbox
                bbox_pdf = region["bbox_pdf"]

                # 렌더링 이미지 좌표계 기준 image bbox
                bbox_rendered = region["bbox"]

                # image block 영역만 잘라서 이미지로 렌더링
                clip_img = render_clip(
                    page,
                    bbox_pdf
                )

                # clip 이미지가 원래 페이지에서 시작하는 좌표
                # OCR 결과 좌표를 전체 페이지 좌표로 되돌릴 때 사용한다.
                x0, y0, _, _ = bbox_rendered

                region_ocr_blocks = extract_ocr_blocks_from_image(
                    clip_img,
                    offset_x=x0,
                    offset_y=y0,
                )

                ocr_blocks.extend(region_ocr_blocks)

            except Exception as e:
                # 특정 이미지 영역 OCR이 실패해도 전체 처리는 계속한다.
                print(f"[이미지 영역 OCR 실패] page={page_number}, error={e}")

        print("ocr before duplicate remove:", len(ocr_blocks))

        # =========================
        # 4. native + OCR 병합
        # =========================
        merged_blocks = native_blocks + ocr_blocks

        # =========================
        # 5. 위치 기준 정렬
        # =========================
        merged_blocks = sort_blocks(
            merged_blocks,
            line_threshold=20
        )

        transformed_blocks = classify_block_type(merged_blocks)
        
        # =========================
        # 6. 반환 형식 변환
        # =========================
        doc_text_result += block_to_markdown(transformed_blocks)

        doc_text_result += "page\n\n"

    doc.close()

    return doc_text_result



'''
로컬 테스트용
'''
# from pathlib import Path

# if __name__ == "__main__":

#     pdf_path = "./tasks/Ai Document Processing Project Artifacts Draft.pdf"
#     pdf_file = Path(pdf_path)

#     with open(pdf_file, "rb") as f:
#         pdf_bytes = f.read()

#     result = run_ocr_pipeline_stub(pdf_bytes)

#     print(result)

'''
로컬 테스트용 END
'''