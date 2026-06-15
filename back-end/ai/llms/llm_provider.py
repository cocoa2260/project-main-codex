import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama

from ai.llms.base import BaseLLMProvider
from core.config import settings


class OllamaLLMProvider(BaseLLMProvider):
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.client = ChatOllama(
            base_url=settings.OLLAMA_URL,
            model=model_name,
            temperature=0.2,
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
                        "4. OCR 오류로 보이는 내용은 '확인 필요' 섹션에 따로 정리합니다.\n"
                        "5. 너무 짧게 요약하지 말고, 원문을 다시 보지 않아도 이해할 수 있을 정도로 자세히 작성합니다.\n"
                        "6. 각 핵심 항목은 단순 키워드가 아니라 2~4문장으로 설명합니다.\n"
                        "7. 문서에 내용이 충분하다면 전체 출력은 최소 800자 이상으로 작성합니다.\n"
                        "8. 비어 있는 섹션은 억지로 만들지 말고 '해당 내용 없음'이라고 작성합니다.\n\n"
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
                        "- OCR 오류 가능성이 있거나 의미가 불명확한 내용을 정리합니다.\n\n"
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
                        "- 불명확하거나 OCR 오류 가능성이 있는 내용을 작성합니다.\n\n"
                        f"{joined_summaries}\n\n/no_think"
                    )
                ),
            ]
        )
        return str(response.content).strip()

    def extract_keywords(self, text: str) -> list[str]:
        response = self.client.invoke(
            [
                SystemMessage(
                    content=(
                        "당신은 법률/계약 문서 chunk에서 검색용 핵심 키워드를 추출하는 전문가입니다. "
                        "한국어 명사구 중심으로 3~8개만 뽑으세요. "
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
