import json
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama

from ai.llms.base import BaseLLMProvider
from core.config import settings


LEGAL_CATEGORY_NAMES = [
    "민법",
    "형법",
    "민사소송법",
    "형사소송법",
    "상법",
    "행정법",
    "노동법",
    "조세법",
    "헌법",
    "지식재산권법",
    "개인정보보호법",
    "기타",
]

CATEGORY_PROMPT = (
    "당신은 한국 법률 문서를 고정된 법률 카테고리 중 하나로 분류하는 전문가입니다.\n"
    "반드시 아래 Seed 카테고리 중 하나만 선택하세요.\n\n"
    "Seed 카테고리:\n"
    "- 민법\n"
    "- 형법\n"
    "- 민사소송법\n"
    "- 형사소송법\n"
    "- 상법\n"
    "- 행정법\n"
    "- 노동법\n"
    "- 조세법\n"
    "- 헌법\n"
    "- 지식재산권법\n"
    "- 개인정보보호법\n"
    "- 기타\n\n"
    "규칙:\n"
    "1. 임의 카테고리를 만들지 마세요.\n"
    "2. 문서에 근거가 부족하면 기타를 선택하세요.\n"
    "3. 키워드 추출 결과는 사용하지 말고 OCR 원문과 요약만 기준으로 판단하세요.\n"
    "4. confidence는 0부터 1 사이의 숫자로 작성하세요.\n"
    "5. 출력은 JSON 객체 하나만 작성하고 설명 문장을 붙이지 마세요.\n\n"
    "출력 형식:\n"
    '{"category":"노동법","confidence":0.91}\n'
    "/no_think"
)


class OllamaLLMProvider(BaseLLMProvider):
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.client = ChatOllama(
            base_url=settings.OLLAMA_URL,
            model=model_name,
            temperature=0.2,
        )
        self.keyword_client = ChatOllama(
            base_url=settings.OLLAMA_URL,
            model=model_name,
            temperature=0,
        )

    # 이전 프롬프트: 문서 전문을 한 번에 요약하던 방식입니다.
    def summarize(self, markdown: str) -> str:
        response = self.client.invoke(
            [
                SystemMessage(
                    content=(
                        "당신은 OCR Markdown 문서를 분석해 한국어 요약문을 작성하는 전문가입니다. "
                        "최종 출력은 반드시 자연스러운 한국어로만 작성합니다. "
                        "원문에 영어가 포함되어 있어도 그대로 복사하지 말고, 의미를 보존해 한국어로 번역해서 정리합니다. "
                        "영어 제목, 영어 안내문, 영어 결론 문장을 출력하지 않습니다. "
                        "문서에 없는 내용은 추측하거나 새로 만들지 않습니다. "
                        "다만 원문에 근거가 있는 중요한 내용은 생략하지 말고 충분히 자세히 설명합니다. "
                        "사용자가 원문을 다시 보지 않아도 문서의 목적, 핵심 내용, 조건, 수치, 흐름을 이해할 수 있게 작성합니다. "
                        "문서 내용이 충분하다면 전체 요약은 최소 800자 이상으로 작성합니다. "
                        "원문 자체가 매우 짧으면 억지로 분량을 늘리지 않습니다. "
                        "OCR 과정에서 생긴 줄바꿈 오류, 반복 문장, 페이지 번호, 머리글, 바닥글은 정리합니다. "
                        "날짜, 금액, 비율, 조건, 기관명, 사람명, 장소명, 의무 사항은 우선적으로 추출합니다. "
                        "추론 과정은 출력하지 말고 최종 결과만 출력합니다. "
                        "/no_think"
                    )
                ),
                HumanMessage(
                    content=(
                        "아래 Markdown 문서를 분석하여 상세 요약을 작성하세요.\n\n"
                        "반드시 지켜야 할 규칙:\n"
                        "1. 최종 답변은 한국어만 사용합니다.\n"
                        "2. 영어 문장, 영어 제목, 영어 설명문을 그대로 출력하지 않습니다.\n"
                        "3. 원문에 있는 내용만 요약하고, 없는 내용은 추가하지 않습니다.\n"
                        "4. OCR 오류로 보이는 내용이 있을 때만 '확인 필요' 섹션에 따로 정리합니다.\n"
                        "5. 너무 짧게 요약하지 말고, 원문을 다시 보지 않아도 이해할 수 있을 정도로 자세히 작성합니다.\n"
                        "6. 각 핵심 항목은 단순 키워드가 아니라 2~4문장으로 설명합니다.\n"
                        "7. 문서에 내용이 충분하다면 전체 출력은 최소 800자 이상으로 작성합니다.\n"
                        "8. '확인 필요'에 작성할 내용이 없으면 해당 섹션 자체를 출력하지 않습니다.\n"
                        "9. '확인 필요 없음', '불확실한 부분: 없음', '없음' 같은 문구를 출력하지 않습니다.\n\n"
                        "출력 형식은 반드시 아래 제목을 그대로 사용합니다. "
                        "제목을 바꾸거나 생략하지 않습니다.\n\n"
                        "## 전체 요약\n"
                        "문서의 목적, 배경, 핵심 결론을 5~8문장으로 설명합니다.\n\n"
                        "## 핵심 내용\n"
                        "- 항목명: 구체적인 내용을 2~4문장으로 설명합니다.\n"
                        "- 항목명: 구체적인 내용을 2~4문장으로 설명합니다.\n\n"
                        "## 중요한 날짜·수치·조건\n"
                        "- 날짜:\n"
                        "- 금액:\n"
                        "- 비율:\n"
                        "- 조건:\n"
                        "- 기타 수치:\n\n"
                        "## 핵심 키워드\n"
                        "- 문서 전체를 대표하는 핵심 키워드 5~15개를 한국어 명사구로 작성합니다.\n"
                        "- 키워드는 반드시 한 줄에 하나씩 작성합니다.\n\n"
                        "## 확인 필요\n"
                        "OCR 오류 가능성이 있거나 의미가 불명확한 내용이 있을 때만 이 섹션을 작성합니다.\n"
                        "작성할 내용이 없으면 이 제목과 섹션을 모두 생략합니다.\n\n"
                        f"문서:\n{markdown}\n\n"
                        "다시 강조합니다. 최종 답변은 반드시 한국어로만 작성합니다. "
                        "중요한 정보가 있다면 짧게 줄이지 말고 충분히 설명합니다. "
                        "/no_think"
                    )
                ),
            ]
        )

        return str(response.content).strip()

    def summarize_chunk(self, text: str) -> str:
        response = self.client.invoke(
            [
                SystemMessage(
                    content=(
                        "당신은 법률/계약 문서 chunk를 한국어로 요약하는 전문가입니다. "
                        "원문에 없는 내용은 만들지 말고, 핵심 쟁점과 조건만 간결하게 정리하세요. "
                        "최종 답변만 출력하세요. /no_think"
                    )
                ),
                HumanMessage(
                    content=(
                        "아래 chunk를 3~5문장으로 요약하세요.\n\n"
                        f"{text}\n\n/no_think"
                    )
                ),
            ]
        )
        return str(response.content).strip()

    def summarize_from_chunk_summaries(self, summaries: list[str]) -> str:
        joined_summaries = "\n\n".join(
            f"## Chunk {idx}\n{summary}"
            for idx, summary in enumerate(summaries)
        )
        response = self.client.invoke(
            [
                SystemMessage(
                    content=(
                        "당신은 여러 chunk 요약을 통합해 문서 전체 요약을 작성하는 전문가입니다. "
                        "반드시 한국어로만 작성하고, chunk 요약에 없는 내용은 추가하지 마세요. "
                        "최종 답변만 출력하세요. /no_think"
                    )
                ),
                HumanMessage(
                    content=(
                        "아래 chunk별 요약을 바탕으로 문서 전체 요약을 작성하세요.\n\n"
                        "출력 형식:\n"
                        "## 전체 요약\n"
                        "문서의 목적과 핵심 내용을 5~8문장으로 작성합니다.\n\n"
                        "## 핵심 내용\n"
                        "- 주요 항목을 구체적으로 작성합니다.\n\n"
                        "## 중요 날짜·수치·조건\n"
                        "- 날짜:\n"
                        "- 금액:\n"
                        "- 조건:\n\n"
                        "## 확인 필요\n"
                        "불명확하거나 OCR 오류 가능성이 있는 내용이 있을 때만 이 섹션을 작성합니다.\n"
                        "확인할 내용이 없으면 '확인 필요', '불확실한 부분', '없음' 같은 문구를 출력하지 말고 섹션 자체를 생략합니다.\n\n"
                        f"{joined_summaries}\n\n/no_think"
                    )
                ),
            ]
        )
        return str(response.content).strip()

    def answer_question(self, question: str, context: str) -> str:
        response = self.client.invoke(
            [
                SystemMessage(
                    content=(
                        "당신은 문서 기반 질의응답 도우미입니다. "
                        "제공된 문서 컨텍스트에 근거해서만 한국어로 답변하세요. "
                        "문서에서 확인할 수 없는 내용은 확인할 수 없다고 말하세요. "
                        "추측하지 말고, 답변은 간결하되 필요한 근거를 포함하세요. "
                        "최종 답변만 출력하세요. /no_think"
                    )
                ),
                HumanMessage(
                    content=(
                        f"문서 컨텍스트:\n{context}\n\n"
                        f"질문:\n{question}\n\n"
                        "답변:"
                    )
                ),
            ]
        )
        return str(response.content).strip()

    def extract_keywords(self, text: str) -> list[str]:
        response = self.keyword_client.invoke(
            [
                SystemMessage(
                    content=(
                        "당신은 법률/계약 문서 chunk에서 검색용 핵심 키워드를 추출하는 전문가입니다. "
                        "문서 chunk 안에 실제로 등장하거나 명확히 근거가 있는 핵심 개념만 한국어 명사구 중심으로 3~8개 뽑으세요. "
                        "명백한 OCR 오타, 깨진 띄어쓰기, 분리된 영문 약어는 자연스러운 전문 용어로 보정하세요. "
                        "동일 의미의 표현은 하나의 대표 키워드로 통합하세요. "
                        "단, 문서에 근거가 없는 유사어, 상위 개념, 관련 법률 용어를 새로 확장해서 만들지 마세요. "
                        "설명하지 말고 쉼표로 구분된 키워드만 출력하세요. /no_think"
                    )
                ),
                HumanMessage(content=f"chunk:\n{text}\n\n/no_think"),
            ]
        )

        raw_keywords = str(response.content).strip()
        keywords: list[str] = []

        for keyword in re.split(r"[,，|/·\n]", raw_keywords):
            cleaned_keyword = (
                keyword.strip()
                .strip("`*_")
                .lstrip("-*0123456789. ")
                .strip()
            )
            if cleaned_keyword and cleaned_keyword not in keywords:
                keywords.append(cleaned_keyword)

        return keywords[:8]

    def extract_question_keywords(self, question: str) -> list[str]:
        response = self.keyword_client.invoke(
            [
                SystemMessage(
                    content=(
                        "당신은 법률 RAG 검색어를 생성하는 전문가입니다.\n\n"
                        "사용자의 자연어 질문을 법률 문서 검색에 적합한 핵심 키워드로 변환하세요.\n\n"
                        "규칙:\n"
                        "질문에 명시된 사실관계만 사용하세요.\n"
                        "질문에 없는 사실을 추론하지 마세요.\n"
                        "범죄, 위법성, 책임, 분쟁 발생 여부를 단정하거나 가정하지 마세요.\n"
                        "질문과 직접 관련된 법률 개념, 권리, 의무, 절차, 제도, 법률 용어를 우선 추출하세요.\n"
                        "질문에 드러난 사실을 단정하지 않는 범위에서, 문서 검색에 도움이 되는 중립적 법률 개념은 포함하세요.\n"
                        "질문 속 구체 정보가 법률 문서에서 더 넓은 중립적 개념으로 분류된다면 해당 개념도 포함하세요.\n"
                        "사용자의 일상 표현은 가능하면 법률 문서에서 실제 사용되는 표준 용어로 변환하세요.\n"
                        "복합 개념보다 독립적으로 검색 가능한 원자적 키워드를 우선 사용하세요.\n"
                        "지나치게 포괄적이거나 추상적인 용어는 제외하세요.\n"
                        "질문과 직접 관련 없는 법률 분야로 확장하지 마세요.\n"
                        "명백한 오타 및 띄어쓰기 오류는 자연스럽게 보정하세요.\n"
                        "동일 의미의 중복 키워드는 제거하세요.\n\n"
                        "좋은 예시\n\n"
                        "질문:\n"
                        "회사에서 짤렸어요\n\n"
                        "출력:\n"
                        "해고, 근로계약, 퇴직, 고용관계\n\n"
                        "질문:\n"
                        "월급을 못 받았어요\n\n"
                        "출력:\n"
                        "임금체불, 급여, 임금지급, 근로기준법\n\n"
                        "질문:\n"
                        "남편이 애를 데리고 나갔어요\n\n"
                        "출력:\n"
                        "배우자, 자녀, 양육권, 친권\n\n"
                        "질문:\n"
                        "집주인이 보증금을 안 돌려줘요\n\n"
                        "출력:\n"
                        "전세보증금, 보증금반환, 임대차계약, 임차인\n\n"
                        "질문:\n"
                        "중고차를 샀는데 침수차였어요\n\n"
                        "출력:\n"
                        "중고차, 하자, 계약해제, 손해배상\n\n"
                        "나쁜 예시\n\n"
                        "질문:\n"
                        "회사에서 짤렸어요\n\n"
                        "출력:\n"
                        "부당해고, 해고무효소송, 손해배상\n\n"
                        "부당 여부가 확인되지 않았으므로 부적절합니다.\n\n"
                        "질문:\n"
                        "남편이 애를 데리고 나갔어요\n\n"
                        "출력:\n"
                        "양육권 분쟁, 아동보호, 아동학대\n\n"
                        "질문에 없는 사실을 추론했으므로 부적절합니다.\n\n"
                        "질문:\n"
                        "월급을 못 받았어요\n\n"
                        "출력:\n"
                        "사기, 횡령, 형사처벌\n\n"
                        "위법행위를 단정했으므로 부적절합니다.\n\n"
                        "출력 형식:\n"
                        "3~8개의 키워드만 출력\n"
                        "쉼표(,)로만 구분\n"
                        "설명 금지\n"
                        "번호 금지\n"
                        "문장 금지\n"
                        "따옴표 금지\n"
                        "줄바꿈 금지\n\n"
                        "/no_think"
                    )
                ),
                HumanMessage(content=f"질문:\n{question}\n\n/no_think"),
            ]
        )

        raw_keywords = str(response.content).strip()
        keywords: list[str] = []

        for keyword in re.split(r"[,，|/·\n]", raw_keywords):
            cleaned_keyword = (
                keyword.strip()
                .strip("`*_\"'")
                .lstrip("-*0123456789. ")
                .strip()
            )
            if cleaned_keyword and cleaned_keyword not in keywords:
                keywords.append(cleaned_keyword)

        return keywords[:8]

    def extract_representative_keyword(self, text: str) -> str | None:
        response = self.keyword_client.invoke(
            [
                SystemMessage(
                    content=(
                        "당신은 OCR 문서 chunk에서 문서 대표 키워드 후보를 고르는 전문가입니다. "
                        "이 chunk 안에 실제로 등장하거나 명확히 근거가 있는 내용 중, 문서 전체 주제를 설명하는 데 도움이 되는 대표 키워드 1개만 한국어 명사구로 작성하세요. "
                        "명백한 OCR 오타는 자연스러운 전문 용어로 보정하세요. "
                        "단, 문서에 근거가 없는 유사어, 상위 개념, 관련 개념을 새로 만들지 마세요. "
                        "설명, 번호, 따옴표, 문장부호 없이 키워드만 출력하세요. /no_think"
                    )
                ),
                HumanMessage(content=f"chunk:\n{text}\n\n/no_think"),
            ]
        )

        keyword = str(response.content).strip()
        keyword = keyword.strip("`*_\"' ")
        keyword = re.sub(r"^[\\-\\*\\d\\.\\s]+", "", keyword).strip()
        keyword = re.split(r"[,，|/·\n]", keyword)[0].strip()

        return keyword or None

    def classify_document_category(self, markdown: str, summary: str) -> dict[str, object]:
        response = self.keyword_client.invoke(
            [
                SystemMessage(content=CATEGORY_PROMPT),
                HumanMessage(
                    content=(
                        "OCR 원문:\n"
                        f"{markdown or ''}\n\n"
                        "Summary:\n"
                        f"{summary or ''}\n\n"
                        "위 OCR 원문과 Summary만 보고 문서 카테고리를 분류하세요.\n"
                        "/no_think"
                    )
                ),
            ]
        )

        raw_content = str(response.content).strip()
        parsed = self._parse_category_response(raw_content)
        category = str(parsed.get("category") or "").strip()
        if category not in LEGAL_CATEGORY_NAMES:
            category = "기타"

        confidence = parsed.get("confidence")
        try:
            confidence_value = float(confidence) if confidence is not None else None
        except (TypeError, ValueError):
            confidence_value = None

        if confidence_value is not None:
            confidence_value = max(0.0, min(1.0, confidence_value))

        return {
            "category": category,
            "confidence": confidence_value,
        }

    def _parse_category_response(self, raw_content: str) -> dict[str, object]:
        normalized = (
            raw_content
            .replace("“", '"')
            .replace("”", '"')
            .replace("‘", "'")
            .replace("’", "'")
        )
        match = re.search(r"\{.*\}", normalized, re.DOTALL)
        json_text = match.group(0) if match else normalized

        try:
            parsed = json.loads(json_text)
        except json.JSONDecodeError:
            category = next((name for name in LEGAL_CATEGORY_NAMES if name in normalized), "기타")
            confidence_match = re.search(r"0(?:\.\d+)?|1(?:\.0+)?", normalized)
            return {
                "category": category,
                "confidence": float(confidence_match.group(0)) if confidence_match else None,
            }

        return parsed if isinstance(parsed, dict) else {}
