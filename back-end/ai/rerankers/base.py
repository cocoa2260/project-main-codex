from abc import ABC, abstractmethod


class BaseRerankerProvider(ABC):

    @abstractmethod
    def reranking(
        self,
        documents: list[str],
        question: str,
        top_k: int,
    ) -> list[str]:
        pass