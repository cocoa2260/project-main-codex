from sentence_transformers import ( CrossEncoder )

import torch

from ai.rerankers.base import ( BaseRerankerProvider )

class HFRerankingProvider(BaseRerankerProvider):

    def __init__(
        self,
        model_name: str,
    ):
        self.model_name = model_name

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


    def reranking(self, documents: list[str], question: str, top_k: int) -> list[str]:
        # (query, doc) pair 생성
        pairs = [[question, doc] for doc in documents]
    
        # score 계산
        scores = self.model.predict(pairs)

        # score + doc 묶기 기준 유사도 설정(0.8 이상)
        ranked = sorted(
            ((doc, score)
            for doc, score in zip(documents, scores)
                # if score >= 0.7
            ),
            key=lambda x: x[1],
            reverse=True
        )

        return ranked[:top_k]