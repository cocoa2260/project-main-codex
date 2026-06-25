# from langchain_ollama import OllamaEmbeddings
from sentence_transformers import (SentenceTransformer)

from ai.embeddings.base import (
    BaseEmbeddingProvider,
)

from ai.embeddings.model_loader import (
    load_merged_model,
)

from models.document import Document
from models.document_chunk import DocumentChunk
from models.document_embedding import DocumentEmbedding
    
class HFEmbeddingProvider(BaseEmbeddingProvider):

    def __init__(
        self,
        model_name: str,
        # adapter_path: str | None = None
    ):
        self.model_name = model_name
        # self.adapter_path = adapter_path

        self._model = None


    @property
    def model(self):

        if self._model is None:

            # if self.adapter_path != None:

            #     self._model = load_merged_model(
            #         self.model_name,
            #         self.adapter_path
            #     )
            # else:

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
        vector_question,
        embedding_model: str,
        top_k: int,
    ):
        contents = retrieval(db, document_id, vector_question, embedding_model, top_k)
            
        return contents

def retrieval(
        db,
        document_id,
        vector_question,
        embedding_model: str,
        top_k: int,
    ):
        contents = []

        similarity = (
            1 - DocumentEmbedding.embedding.cosine_distance(vector_question)
        ).label("similarity")

        # 문서id, 임베딩 모델과 관련된 데이터 추출
        rows = (
            db.query(
                DocumentChunk.content,
                Document.file_name,
                similarity
            )
            .join(
                DocumentEmbedding.chunk
            )
            .join(
                Document,
                DocumentEmbedding.document_id == Document.id
            )
            .filter(
                DocumentEmbedding.embedding_model == embedding_model,
                # DocumentEmbedding.document_id == document_id,
            )
            .order_by(
                similarity.desc()
            )
            .limit(top_k)
            .all()
        )

        for o in rows :
            contents.append({'content': o.content, 'file_name': o.file_name})

        return contents