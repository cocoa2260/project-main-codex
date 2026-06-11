from sentence_transformers import ( CrossEncoder )

import torch

from ai.rerankers.base import ( BaseRerankerProvider )

class HFRerankingProvider(BaseRerankerProvider):

    def __init__(
        self,
        model_name: str,
        adapter_path: str | None = None
    ):
        self.model_name = model_name
        self.adapter_path = adapter_path

        self._model = None


    @property
    def model(self):

        device = "cuda" if torch.cuda.is_available() else "cpu"

        if self._model is None:
            self._model = CrossEncoder(
                self.model_name,
                device=device
            )

        return self._model


    def reranking(self, documents: list[str], text: str, top_k: int) -> list[str]:
        # (query, doc) pair 생성
        pairs = [[text, doc] for doc in documents]
    
        # score 계산
        scores = self.model.predict(pairs)

        # score + doc 묶기
        ranked = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)

        return ranked[:top_k]