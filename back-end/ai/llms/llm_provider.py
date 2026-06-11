from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama

from ai.llms.base import BaseLLMProvider
from core.config import settings


class OllamaLLMProvider(BaseLLMProvider):
    def __init__(self, model_name: str):
        # 실제 Ollama LLM 클라이언트를 생성한다.
        # model_name은 qwen3:4b, gemma3:4b처럼 factory에서 넘어온 모델명이다.
        self.model_name = model_name
        self.client = ChatOllama(
            base_url=settings.OLLAMA_URL,
            model=model_name,
            temperature=0.2,
        )

    def summarize(self, markdown: str) -> str:
        # OCR 결과 Markdown을 LLM에 전달하고, 최종 요약 텍스트만 반환한다.
        response = self.client.invoke(
            [
                SystemMessage(
                    content=(
                        # Qwen 계열 모델이 추론 과정을 출력하지 않도록 최종 답변만 요구한다.
                        "너는 OCR Markdown 문서를 한국어로 요약하는 전문가다. "
                        "최종 출력은 반드시 한국어만 사용한다. "
                        "원문에 영어가 있어도 모두 한국어로 번역해서 요약한다. "
                        "영어 문장, 영어 도입부, 영어 결론 문구를 절대 출력하지 않는다. "
                        "문서에 없는 내용은 추측하지 않는다. "
                        "추론 과정은 출력하지 말고 최종 요약만 출력한다. "
                        "/no_think"
                    )
                ),
                HumanMessage(
                    content=(
                        "아래 Markdown 문서를 요약해라.\n"
                        "중요: 원문 언어와 상관없이 최종 답변은 반드시 한국어로만 작성해라.\n"
                        "영어 설명문, 영어 안내문, 영어 결론문을 출력하면 안 된다.\n\n"
                        "출력 형식:\n"
                        "1. 핵심 요약\n"
                        "2. 주요 내용\n"
                        "3. 중요한 날짜/수치/조건\n"
                        "4. 확인이 필요한 내용\n\n"
                        f"문서:\n{markdown}\n\n"
                        "다시 강조: 최종 답변은 한국어만 사용해라. /no_think"
                    )
                ),
            ]
        )

        return str(response.content).strip()
