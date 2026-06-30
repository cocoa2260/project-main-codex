import re
import cv2
import numpy as np

def table_to_markdown(table_text):
    lines = [line.strip() for line in table_text.split("\n") if line.strip()]

    rows = []
    for line in lines:
        cols = [c.strip() for c in re.split(r"\s{2,}", line)]
        rows.append(cols)

    if len(rows) < 2:
        return table_text

    md = []
    md.append("| " + " | ".join(rows[0]) + " |")
    md.append("| " + " | ".join(["---"] * len(rows[0])) + " |")

    for row in rows[1:]:
        md.append("| " + " | ".join(row) + " |")

    return "\n".join(md)


def block_to_markdown(data):
    result = []

    for block in data:

        # table block
        if isinstance(block, dict):
            if block.get("source") == "table":
                result.append(table_to_markdown(block["text"]))
            else:
                result.append(block["text"])

        # native block
        elif isinstance(block, list):
            texts = []

            for item in block:
                text = item.get("text", "")

                if item.get("source") == "table":
                    texts.append(table_to_markdown(text))
                else:
                    texts.append(text)

            result.append("\n".join(texts))

    return "\n".join(result)

def pixmap_to_cv2(pix):
    """
    PyMuPDF Pixmap 객체를 OpenCV에서 사용할 수 있는 numpy 이미지로 변환한다.

    PyMuPDF:
        page.get_pixmap() -> Pixmap

    OpenCV / PaddleOCR:
        numpy.ndarray 형태 이미지 사용

    반환:
        RGB numpy.ndarray
    """

    # Pixmap의 raw pixel 데이터를 numpy 배열로 변환한다.
    img = np.frombuffer(
        pix.samples,
        dtype=np.uint8
    ).reshape(
        pix.height,
        pix.width,
        pix.n
    )

    # pix.n은 채널 수다.
    # 4면 RGBA, 3이면 RGB, 1이면 Gray라고 보면 된다.
    if pix.n == 4:
        # RGBA -> RGB
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)

    elif pix.n == 1:
        # Gray -> RGB
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)

    # PaddleOCR / OpenCV 처리를 위해 메모리 연속 배열로 변환
    return np.ascontiguousarray(img)