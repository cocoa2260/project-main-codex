from abc import ABC, abstractmethod


class BaseEmbeddingProvider(ABC):
    @abstractmethod
    def embed(self, text: str):
        pass

    @abstractmethod
    def search(
        self,
        db,
        document_id,
        input_text: list[float],
        embedding_model: str,
        top_k: int,
    ):
        """
        Input
            query_vector
            embedding_model
            top_k

        Output
            [
                {
                    "chunk_id": "...",
                    "content": "...",
                    "score": 0.91,
                }
            ]
        """
        pass
