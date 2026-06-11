import os
import fitz  # PyMuPDF
from celery import group
from tasks.ocr_tasks import ocr_image_area


PDF_PATH = "/storage/resume-guide.pdf"
OUTPUT_DIR = "/storage/ocr_test_images"


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def extract_page_text(page):
    """
    PDF 텍스트 레이어에서 텍스트 블록 추출
    """
    text_blocks = []

    blocks = page.get_text("blocks")

    for block in blocks:
        x0, y0, x1, y1, text, block_no, block_type = block

        # block_type == 0 : text
        if block_type == 0 and text.strip():
            text_blocks.append({
                "bbox": [x0, y0, x1, y1],
                "text": text.strip(),
            })

    return text_blocks


def extract_page_images(doc, page, page_no: int):
    """
    PDF 페이지 안의 이미지 객체 추출
    """
    image_infos = []

    images = page.get_images(full=True)

    for image_no, img in enumerate(images, start=1):
        xref = img[0]
        image_data = doc.extract_image(xref)

        image_bytes = image_data["image"]
        image_ext = image_data["ext"]

        image_filename = f"page_{page_no}_image_{image_no}.{image_ext}"
        image_path = os.path.join(OUTPUT_DIR, image_filename)

        with open(image_path, "wb") as f:
            f.write(image_bytes)

        image_infos.append({
            "page_no": page_no,
            "image_no": image_no,
            "image_path": image_path,
            "ext": image_ext,
        })

    return image_infos


def main():
    ensure_dir(OUTPUT_DIR)

    if not os.path.exists(PDF_PATH):
        raise FileNotFoundError(f"PDF 파일이 없습니다: {PDF_PATH}")

    doc = fitz.open(PDF_PATH)

    all_text_results = []
    all_image_results = []

    print(f"전체 페이지 수: {len(doc)}")

    for page_index in range(len(doc)):
        page_no = page_index + 1
        page = doc[page_index]

        print(f"\n===== PAGE {page_no} =====")

        text_blocks = extract_page_text(page)
        image_infos = extract_page_images(doc, page, page_no)

        print(f"텍스트 블록 수: {len(text_blocks)}")
        print(f"이미지 수: {len(image_infos)}")

        all_text_results.append({
            "page_no": page_no,
            "text_blocks": text_blocks,
        })

        all_image_results.extend(image_infos)

    print("\n===== Celery OCR 작업 생성 =====")
    print(f"OCR 대상 이미지 수: {len(all_image_results)}")

    if all_image_results:
        job = group(
            ocr_image_area.s(
                image_info["image_path"],
                image_info["page_no"],
                image_info["image_no"],
            )
            for image_info in all_image_results
        )

        async_result = job.apply_async()
        print("Celery OCR 작업 대기 중...")
        ocr_results = async_result.get(timeout=300)

        print("\n===== OCR 결과 =====")
        for result in ocr_results:
            print(result)

    print("\n===== 텍스트 추출 결과 =====")
    for page_result in all_text_results:
        print(f"\n[PAGE {page_result['page_no']}]")
        for block in page_result["text_blocks"]:
            print(block["text"][:200])


if __name__ == "__main__":
    main()