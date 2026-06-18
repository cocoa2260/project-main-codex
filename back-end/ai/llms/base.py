from abc import ABC, abstractmethod


class BaseLLMProvider(ABC):
    # LLM provider들이 반드시 구현해야 하는 공통 인터페이스다.
    # summary_tasks.py는 구체 모델이 Ollama인지, 다른 API인지 몰라도 summarize만 호출하면 된다.
    @abstractmethod
    def summarize(self, markdown: str) -> str:
        pass

    def summarize_chunk(self, text: str) -> str:
        return self.summarize(text)

    def summarize_from_chunk_summaries(self, summaries: list[str], prompt: str | None = None) -> str:
        return self.summarize("\n\n".join(summaries))

    def answer_question(self, question: str, context: str, prompt: str | None = None) -> str:
        return self.summarize(
            "문서 컨텍스트:\n"
            f"{context}\n\n"
            "질문:\n"
            f"{question}"
        )

    def extract_keywords(self, text: str) -> list[str]:
        return []

    def extract_question_keywords(self, question: str) -> list[str]:
        return self.extract_keywords(question)

    def classify_document_category(self, markdown: str, summary: str, prompt: str | None = None) -> dict[str, object]:
        return {
            "category": "기타",
            "confidence": None,
        }
