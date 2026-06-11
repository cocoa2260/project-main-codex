# from langchain_ollama import OllamaEmbeddings
from sentence_transformers import (SentenceTransformer)

from ai.embeddings.base import (
    BaseEmbeddingProvider,
)

from ai.embeddings.model_loader import (
    load_merged_model,
)

from models.document_chunk import DocumentChunk
from models.document_embedding import DocumentEmbedding

from utils.calc_cos import calc_cos_score
    
class HFEmbeddingProvider(BaseEmbeddingProvider):

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

        if self._model is None:

            if self.adapter_path != None:

                self._model = load_merged_model(
                    self.model_name,
                    self.adapter_path
                )
            else:

                self._model = SentenceTransformer(
                    self.model_name
                )

        return self._model

    def embed(self, text: str):

        vector = self.model.encode(
            text,
            normalize_embeddings=True
        )

        return vector.astype(float).tolist()
    
    def search(
        self,
        db,
        document_id,
        vector_question: list[float],
        embedding_model: str,
        top_k: int,
    ):
        contents = retrieval(db, document_id, vector_question, embedding_model, top_k)
            
        return contents

def retrieval(
        self,
        db,
        document_id,
        vector_question: list[float],
        embedding_model: str,
        top_k: int,
    ):
        contents = []
        # 문서id, 임베딩 모델과 관련된 데이터 추출
        rows = (
            db.query(
                DocumentEmbedding.chunk_id,
                DocumentEmbedding.embedding
            )
            .filter(
                DocumentEmbedding.document_id == document_id,
                DocumentEmbedding.embedding_model == embedding_model,
            )
            .all()
        )

        if not rows:
            return []

        # cosine 유사도 계산으로 줄세우기
        scored = calc_cos_score(rows, vector_question)

        scored.sort(key=lambda x: x[0], reverse=True)

        top_chunk_ids = [
            chunk_id for _, chunk_id in scored[:top_k]
        ]

        # DB에서 재검색
        chunks = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.id.in_(top_chunk_ids))
            .all()
        )

        # 순서 보장 (IN은 순서 보장 안됨)
        chunk_map = {c.id: c for c in chunks}

        ordered_chunks = [ chunk_map[cid] for cid in top_chunk_ids if cid in chunk_map ]

        for o in ordered_chunks :
            contents.append(o.content)

        return contents