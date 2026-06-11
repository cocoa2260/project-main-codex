from abc import ABC, abstractmethod


class BaseLLMProvider(ABC):
    # LLM provider들이 반드시 구현해야 하는 공통 인터페이스다.
    # summary_tasks.py는 구체 모델이 Ollama인지, 다른 API인지 몰라도 summarize만 호출하면 된다.
    @abstractmethod
    def summarize(self, markdown: str) -> str:
        pass
