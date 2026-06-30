import json
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from collections import Counter

from ai.llms.base import BaseLLMProvider
from core.config import settings
# from services.prompt_defaults import DEFAULT_CATEGORY_PROMPT
# from services.prompt_defaults import DEFAULT_QA_PROMPT
# from services.prompt_defaults import DEFAULT_SUMMARY_PROMPT

import services.prompt_defaults as PROMPT

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

class OllamaLLMProvider(BaseLLMProvider):
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.client = ChatOllama(
            base_url=settings.OLLAMA_URL,
            model=model_name,
            temperature=0.2,
            num_ctx=8192,
            num_predict=4096,
        )
        self.summary_client = ChatOllama(
            base_url=settings.OLLAMA_URL,
            model=model_name,
            temperature=0.1,
            num_ctx=16384,
            num_predict=4096,
            reasoning=False,
            client_kwargs={"timeout": 300.0},
        )
        self.final_summary_client = ChatOllama(
            base_url=settings.OLLAMA_URL,
            model=model_name,
            temperature=0.1,
            num_ctx=32768,
            num_predict=8192,
            reasoning=False,
            client_kwargs={"timeout": 600.0},
        )
        self.keyword_client = ChatOllama(
            base_url=settings.OLLAMA_URL,
            model=model_name,
            temperature=0,
            num_ctx=4096,
            num_predict=128,
            reasoning=False,
            client_kwargs={"timeout": 120.0},
        )

    def _limit_text(self, text: str, max_chars: int = 2000) -> str:
        if not text:
            return ""
        return text[:max_chars]

    def _remove_empty_summary_sections(self, text: str) -> str:
        empty_values = r"(?:없음|해당 없음|원문에 명시된 내용 없음|확인할 내용이 없음)"

        cleaned = re.sub(
            rf"(?ms)^##\s*확인 필요\s*\n\s*(?:[-*]\s*)?{empty_values}\s*[.。]?\s*(?=^##|\Z)",
            "",
            text,
        )
        cleaned = re.sub(
            rf"(?m)^\s*(?:[-*]\s*)?\*{{0,2}}(?:대상|지원 내용|권리|의무|금지|벌칙|날짜·기간·금액·조건|확인 필요)\*{{0,2}}\s*[:：]\s*{empty_values}\s*[.。]?\s*$",
            "",
            cleaned,
        )
        cleaned = re.sub(
            rf"\s*\*\*(?:대상|지원 내용|권리|의무|금지|벌칙|확인 필요):\*\*\s*{empty_values}\s*[.。]?",
            " ",
            cleaned,
        )
        cleaned = re.sub(
            rf"\s*(?:##\s*)?확인 필요\s*[:：]?\s*{empty_values}\s*[.。]?\s*$",
            "",
            cleaned,
        )
        cleaned = re.sub(
            r"\s*(?:##\s*)?확인 필요\s*$",
            "",
            cleaned,
        )
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
        return cleaned.strip()

    def _extract_summary_content(self, response: object) -> str:
        raw_content = str(getattr(response, "content", "") or "").strip()
        response_metadata = getattr(response, "response_metadata", {}) or {}

        # 출력 한도에 걸리면 최종 답변이 나오기 전 내부 추론만 반환될 수 있다.
        # 이 경우 잘린 영어 추론문을 정상 요약으로 저장하지 않는다.
        if response_metadata.get("done_reason") == "length":
            raise ValueError("LLM summary response was truncated before completion.")

        # 일부 Qwen3/Ollama 조합은 reasoning=False와 /no_think를 사용해도
        # 내부 추론 뒤에 </think>를 붙여 반환하므로 최종 답변만 저장한다.
        if "</think>" in raw_content:
            raw_content = raw_content.rsplit("</think>", 1)[-1].strip()
        elif re.match(r"^(Okay|We need|Let me|First,|The user)", raw_content, re.IGNORECASE):
            raise ValueError("LLM returned reasoning text instead of a final summary.")

        if not raw_content:
            raise ValueError("LLM summary response is empty.")

        return self._remove_empty_summary_sections(raw_content)

    # 문서 전체를 직접 요약하는 경우용
    def summarize(self, markdown: str, prompt: str | None = None) -> str:
        markdown = self._limit_text(markdown, 20000)

        response = self.final_summary_client.invoke(
            [
                SystemMessage(
                    content=(prompt or PROMPT.DEFAULT_SUMMARY_PROMPT)
                ),
                HumanMessage(
                    content=(markdown)
                ),
            ]
        )

        return self._extract_summary_content(response)

    def summarize_chunk(self, text: str, prompt: str | None = None) -> str:
        text = self._limit_text(text, 3500)

        if not text.strip():
            return "내용이 비어 있어 요약할 수 없습니다."

        response = self.summary_client.invoke(
            [
                SystemMessage(
                    content=(prompt or PROMPT.SUMMARY_CHUNK_PROMPT)
                ),
                HumanMessage(
                    content=(text)
                ),
            ]
        )
        return self._extract_summary_content(response)

    def summarize_from_chunk_summaries(self, summaries: list[str], prompt: str | None = None) -> str:
        joined_summaries = "\n\n".join(
            f"## Chunk {idx}\n{summary}"
            for idx, summary in enumerate(summaries)
        )

        joined_summaries = self._limit_text(joined_summaries, 12000)

        if not joined_summaries.strip():
            return "요약할 내용이 없습니다."

        primary_messages = [
            SystemMessage(content=(prompt or PROMPT.SUMMARY_CHUNKS_PROMPT)),
            HumanMessage(
                content=(joined_summaries)
            ),
        ]

        response = self.final_summary_client.invoke(primary_messages)

        try:
            return self._extract_summary_content(response)
        except ValueError as error:
            if "truncated before completion" not in str(error):
                raise

        retry_messages = [
            SystemMessage(
                content=(
                    "[TASK=SUMMARY]"
                    "법률 문서 요약문을 작성하세요. 반드시 한국어 최종 답변만 출력하고, "
                    "제공된 chunk 요약의 사실과 법적 표현을 변경하거나 추측하지 마세요. /no_think"
                )
            ),
            HumanMessage(
                content=(
                    "아래 내용을 다시 요약하세요. 내부 분석은 출력하지 말고 바로 최종 답변을 작성하세요.\n"
                    "형식은 '## 전체 요약', '## 핵심 내용', '## 중요 날짜·수치·조건'만 사용하세요.\n"
                    "없는 항목은 생략하고 전체 답변은 1,500자 이내로 작성하세요.\n\n"
                    f"{joined_summaries}\n\n/no_think"
                )
            ),
        ]
        retry_response = self.final_summary_client.invoke(retry_messages)
        return self._extract_summary_content(retry_response)

    def summarize_question(self, question: str, prompt: str | None = None) -> str:
        response = self.client.invoke(
            [
                SystemMessage(
                    content=(prompt or PROMPT.SUMMARY_QUESTION_PROMPT)
                ),
                HumanMessage(
                    content=(
                        f"질문:\n{question}\n\n"
                    )
                ),
            ]
        )

        return str(response.content).strip()

    def answer_question(self, question: str, context: str, prompt: str | None = None) -> str:
        context = self._limit_text(context, 20000)

        try:
            response = self.client.invoke(
                [
                    SystemMessage(
                        content=(prompt or PROMPT.DEFAULT_QA_PROMPT)
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

        except Exception as exc:
            print(exc)
            return "질문에 대한 답변을 생성하는 중 오류가 발생했습니다."
            
        return str(response.content).strip()

    # 문서 chunk에서 법률 RAG 검색에 사용할 표준 키워드를 LLM으로 추출한다.
    def extract_keywords(self, text: str, prompt: str | None = None) -> list[str]:
        text = self._limit_text(text, 4000)

        if not text.strip():
            return []

        response = self.keyword_client.invoke(
            [
                SystemMessage(
                    content=(prompt or PROMPT.EXTRACT_KEYWORD_PROMPT)
                ),
                HumanMessage(
                    content=(
                        "아래 chunk에서 법률 RAG 검색용 키워드를 추출하세요.\n\n"
                        f"{text}\n\n"
                        "/no_think"
                    )
                ),
            ]
        )

        raw_keywords = str(response.content).strip()
        keywords: list[str] = []

        for keyword in re.split(r"[,，|\n]", raw_keywords):
            cleaned_keyword = (
                keyword.strip()
                .strip("`*_\"'")
                .strip()
            )
            cleaned_keyword = re.sub(r"^[-*]\s*", "", cleaned_keyword)
            cleaned_keyword = re.sub(r"^\d+[\.)]\s+", "", cleaned_keyword).strip()
            if cleaned_keyword and cleaned_keyword not in keywords:
                keywords.append(cleaned_keyword)

        if not keywords:
            return ["문서", "요약", "핵심내용"]

        return keywords[:12]

    # 질문 검색용 키워드는 RAG 검색 품질을 위해 LLM 사용
    def extract_question_keywords(self, question: str, prompt: str | None = None) -> list[str]:
        response = self.keyword_client.invoke(
            [
                SystemMessage(
                    content=(prompt or PROMPT.EXTRACT_QUESTION_KEYWORD_PROMPT)
                ),
                HumanMessage(content=f"질문:\n{question}\n\n/no_think"),
            ]
        )

        raw_keywords = str(response.content).strip()
        keywords: list[str] = []

        for keyword in re.split(r"[,，|\n]", raw_keywords):
            cleaned_keyword = (
                keyword.strip()
                .strip("`*_\"'")
                .strip()
            )
            cleaned_keyword = re.sub(r"^[-*]\s*", "", cleaned_keyword)
            cleaned_keyword = re.sub(r"^\d+[\.)]\s+", "", cleaned_keyword).strip()
            if cleaned_keyword and cleaned_keyword not in keywords:
                keywords.append(cleaned_keyword)

        return keywords[:8]

    def extract_representative_keyword(
        self,
        text: str,
        candidate_keywords: list[str] | None = None,
        prompt: str | None = None,
    ) -> str | None:
        text = self._limit_text(text, 4000)
        candidates = [
            keyword.strip()
            for keyword in (candidate_keywords or self.extract_keywords(text))
            if keyword and keyword.strip()
        ]

        candidates = [
            keyword
            for keyword in candidates
            if not keyword.isdigit()
        ]

        if not text.strip() or not candidates:
            return None

        response = self.keyword_client.invoke(
            [
                SystemMessage(
                    content=(prompt or PROMPT.EXTRACT_REPRESENT_KEYWORD_PROMPT)
                ),
                HumanMessage(
                    content=(
                        f"문서 chunk:\n{text}\n\n"
                        f"후보 키워드:\n{', '.join(candidates)}\n\n"
                        "/no_think"
                    )
                ),
            ]
        )

        keyword = str(response.content).strip().strip("`*_\"' ")
        keyword = re.sub(r"^[-*]\s*", "", keyword)
        keyword = re.sub(r"^\d+[\.)]\s+", "", keyword).strip()
        keyword = re.split(r"[,，|\n]", keyword)[0].strip()

        if keyword in candidates:
            return keyword

        normalized_keyword = re.sub(r"\s+", " ", keyword)
        for candidate in candidates:
            if re.sub(r"\s+", " ", candidate) == normalized_keyword:
                return candidate

        return candidates[0]

    def classify_document_category(self, markdown: str, summary: str, prompt: str | None = None) -> dict[str, object]:
        response = self.keyword_client.invoke(
            [
                SystemMessage(content=(prompt or PROMPT.DEFAULT_CATEGORY_PROMPT)),
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
