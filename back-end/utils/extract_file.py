import cv2
import numpy as np
import pymupdf
import re

from utils.converter import pixmap_to_cv2

zoom = 2

# ============================================================
# OCR 인스턴스 전역 캐싱
# ============================================================
# PaddleOCR 객체는 생성 비용이 크다.
# 매 페이지마다 새로 만들면 매우 느리다.
#
# 따라서 최초 1회만 생성하고 이후에는 재사용한다.
ocr_instance = None

def check_table(table_text):

    for s in table_text:
        c = s['text'].split("   ")

        if len(c) <= 1:
            return False
    

    if len(table_text) < 3:
        return False

    return True

def get_ocr():
    """
    PaddleOCR 인스턴스를 가져오는 함수.

    - 최초 호출 시 PaddleOCR 객체 생성
    - 이후 호출 시 기존 객체 재사용
    - paddleocr import는 반드시 함수 내부에서 한다.
      이유는 파일 상단에서 환경변수를 먼저 설정해야 하기 때문이다.
    """

    global ocr_instance

    if ocr_instance is None:
        from paddleocr import PaddleOCR

        # PaddleOCR 3.x 계열 기준 옵션
        # 사용 중인 버전에 따라 일부 옵션명이 다를 수 있다.
        ocr_instance = PaddleOCR(
            lang="korean",
            device="cpu",

            # 문서 방향 분류 비활성화
            # 켜두면 속도가 느려질 수 있다.
            use_doc_orientation_classify=False,

            # 문서 펼침 / 왜곡 보정 비활성화
            use_doc_unwarping=False,

            # 텍스트 라인 방향 감지 비활성화
            use_textline_orientation=False,
        )

    return ocr_instance

def render_clip(page, bbox_pdf):
    """
    PDF 페이지의 특정 영역만 이미지로 렌더링한다.

    전체 페이지 렌더링:
        page.get_pixmap(matrix=...)

    특정 영역 렌더링:
        page.get_pixmap(matrix=..., clip=Rect(...))

    여기서는 이미지 block bbox 영역만 잘라서 OCR하기 위해 clip을 사용한다.

    bbox_pdf:
        PDF 좌표계 기준 bbox
        예: (x0, y0, x1, y1)

    반환:
        OpenCV / PaddleOCR에 넣을 수 있는 numpy 이미지
    """

    rect = pymupdf.Rect(bbox_pdf)
    matrix = pymupdf.Matrix(zoom, zoom)

    pix = page.get_pixmap(
        matrix=matrix,

        # clip 영역만 렌더링
        clip=rect,

        # alpha=False로 배경 투명도 제거
        alpha=False,

        # 주석/annotation은 제외
        annots=False,
    )

    return pixmap_to_cv2(pix)

def build_table_block(cells):
    


    x0 = min(c["bbox"][0] for c in cells)
    y0 = min(c["bbox"][1] for c in cells)
    x1 = max(c["bbox"][2] for c in cells)
    y1 = max(c["bbox"][3] for c in cells)

    text = "\n".join(
        c["text"]
        for c in cells
    )

    return {
        "bbox": (
            x0 * zoom,
            y0 * zoom,
            x1 * zoom,
            y1 * zoom,
        ),
        "text": text,
        "source": "table",
    }

def extract_native_blocks(page):
    """
    PDF 페이지에서 native text를 span 단위로 추출한다.

    page.get_text("dict") 구조:
    {
        "blocks": [
            {
                "type": 0,
                "bbox": (...),
                "lines": [
                    {
                        "spans": [
                            {
                                "text": "...",
                                "bbox": (...)
                            }
                        ]
                    }
                ]
            }
        ]
    }

    block type:
    - 0: text block
    - 1: image block

    zoom을 곱하는 이유:
    - OCR 이미지 좌표는 렌더링된 픽셀 좌표 기준이다.
    - page.get_text()의 bbox는 PDF 좌표 기준이다.
    - page.get_pixmap(matrix=Matrix(zoom, zoom))으로 렌더링하면
      이미지 좌표도 zoom배 커진다.
    - 따라서 native text bbox에도 zoom을 곱해서 좌표계를 맞춘다.
    """

    blocks = []

# 나머지 글자 추출

    data = page.get_text("dict")

    for block in data.get("blocks", []):
        block_type = block.get("type")

        # type 0만 native text
        if block_type != 0:
            continue

        block_text = ""

        # TODO : span의 y좌표가 다르면 줄바꿈 처리

        for line in block.get("lines", []):
            for span in line.get("spans", []):
                span_text = span.get("text", "").strip()

                # 빈 텍스트는 제외
                if not span_text:
                    continue


                block_text += "    " + span_text


        x0, y0, x1, y1 = span["bbox"]

        blocks.append({
            # OCR 좌표와 맞추기 위해 zoom 적용
            "bbox": (
                x0 * zoom,
                y0 * zoom,
                x1 * zoom,
                y1 * zoom,
            ),
            "text": block_text,
            "source": "native",
        })

    return blocks


def extract_image_regions(page):
    """
    PDF 페이지에서 image block 영역만 추출한다.
    
    반환값:
    [
        {
            "bbox_pdf": PDF 좌표계 bbox,
            "bbox": 렌더링 이미지 좌표계 bbox,
            "source": "image_region",
        }
    ]
    """

    regions = []

    data = page.get_text("dict")

    for block in data.get("blocks", []):
        block_type = block.get("type")

        # type 1만 image block
        if block_type != 1:
            continue

        bbox = block.get("bbox")

        if not bbox:
            continue

        x0, y0, x1, y1 = bbox

        width = x1 - x0
        height = y1 - y0

        # 너무 작은 이미지 제외
        # 이런 것까지 OCR하면 시간만 늘고 결과 품질이 떨어진다.
        if width < 40 or height < 25:
            continue

        regions.append({
            # PDF 원본 좌표
            # page.get_pixmap(clip=...)에는 PDF 좌표가 필요하다.
            "bbox_pdf": (
                x0,
                y0,
                x1,
                y1,
            ),

            # 렌더링 이미지 좌표
            # OCR 결과와 병합할 때 사용한다.
            "bbox": (
                x0 * zoom,
                y0 * zoom,
                x1 * zoom,
                y1 * zoom,
            ),

            "source": "image_region",
        })

    return regions

def extract_ocr_blocks_from_image(img, offset_x=0, offset_y=0):
    """
    이미지 block 하나에 OCR을 실행하고, OCR 결과를 block 구조로 반환한다.

    OCR 결과 좌표:
    - OCR이 반환하는 좌표는 clip 이미지 내부 좌표다.
    - 하지만 native text와 병합하려면 전체 페이지 기준 좌표가 필요하다.
    - 그래서 offset_x, offset_y를 더해서 원래 페이지 좌표로 되돌린다.
    """

    try:
        # PaddleOCR 3.x 계열 predict 방식
        results = get_ocr().predict(img)

    except Exception as e:
        # OCR이 실패해도 전체 API가 죽으면 안 된다.
        # native text만으로도 요약이 가능해야 한다.
        print(f"[OCR 오류] {e}")
        return []

    blocks = []

    for page_result in results:
        # PaddleOCR 3.x 결과 구조
        rec_texts = page_result.get("rec_texts", [])
        rec_polys = page_result.get("rec_polys", [])

        for text, poly in zip(rec_texts, rec_polys):
            text = text.strip()

            if not text:
                continue

            # poly는 OCR 텍스트 영역의 사각형 또는 다각형 좌표다.
            # bbox 정렬을 위해 감싸는 사각형으로 변환한다.
            poly = np.array(poly)

            # clip 내부 좌표 + 원래 이미지 영역 offset
            x0 = float(np.min(poly[:, 0])) + offset_x
            y0 = float(np.min(poly[:, 1])) + offset_y
            x1 = float(np.max(poly[:, 0])) + offset_x
            y1 = float(np.max(poly[:, 1])) + offset_y

            blocks.append({
                "bbox": (
                    x0,
                    y0,
                    x1,
                    y1,
                ),
                "text": text,
                "source": "ocr",
            })

    return blocks

def sort_blocks(blocks, line_threshold=20):
    """
    bbox 위치 기준으로 block을 읽기 순서에 가깝게 정렬한다.

    정렬 방식:
    1. y 좌표 기준으로 위에서 아래 정렬
    2. 비슷한 y 좌표끼리는 같은 줄로 묶기
    3. 같은 줄 안에서는 x 좌표 기준으로 왼쪽에서 오른쪽 정렬

    line_threshold:
    - 같은 줄로 판단할 y 좌표 차이
    - 값이 작으면 줄 분리가 촘촘해지고
    - 값이 크면 서로 다른 줄도 같은 줄로 묶일 수 있다.
    """

    # 먼저 y, x 기준으로 대략 정렬
    blocks = sorted(
        blocks,
        key=lambda b: (
            b["bbox"][1],
            b["bbox"][0],
        )
    )

    lines = []

    for block in blocks:
        y0 = block["bbox"][1]
        y1 = block["bbox"][3]

        # block의 세로 중앙값
        center_y = (y0 + y1) / 2

        placed = False

        for line in lines:
            # 현재 line에 있는 block들의 세로 중앙값 평균
            line_center_y = np.mean([
                (b["bbox"][1] + b["bbox"][3]) / 2
                for b in line
            ])

            # y 중앙값이 비슷하면 같은 줄로 판단
            if abs(center_y - line_center_y) < line_threshold:
                line.append(block)
                placed = True
                break

        # 기존 line에 들어가지 못하면 새 line 생성
        if not placed:
            lines.append([block])

    sorted_blocks = []

    for line in lines:
        # 같은 줄 안에서는 왼쪽에서 오른쪽 순서
        line = sorted(
            line,
            key=lambda b: b["bbox"][0]
        )

        sorted_blocks.extend(line)

    return sorted_blocks

def classify_block_type(blocks):

    bef_x = None
    table_text = []
    new_blocks = []

    for block in blocks:
        bbox = block["bbox"]
        x0 = round(bbox[0], 1)

        block_text = block["text"]
        block_source = block["source"]

        block_text = re.sub(r"[•◦▪▫‣⁃∙]\s*", "", block_text)
        block_text = block_text.strip()

        if not block_text:
            continue

        # 전체 로직
        # 1. 각 줄당 정보를 기록
        # 2. x0 좌표가 바뀌면 텍스트인지, 테이블인지 나뉨
        #   2-1. 같은게 3개 이상 있으면 표로 처리
        #   2-2. 같은게 2개 미만일 경우 바로 저장

        if(bef_x is None):
            bef_x = x0

        if abs(x0 - bef_x) < 3:
            table_text.append({
                "bbox": bbox,
                "text": "".join(block_text),
                "source": block_source
            })

        else:
            if check_table(table_text):
                table = build_table_block(
                    table_text
                )

                new_blocks.append(table)
            else:
                new_blocks.append(table_text)


            table_text = [{
                "bbox": bbox,
                "text": block_text,
                "source": block_source,
            }]

            bef_x = x0
    

    # TODO : 표로 인식하는 조건 추가
    #           -> 컬럼이 1개인 경우는 native text로 처리

    if check_table(table_text):
        table = build_table_block(table_text)
        new_blocks.append(table)
    else:
        new_blocks.append(table_text)
                
    return new_blocks