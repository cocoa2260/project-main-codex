import torch
from sentence_transformers import CrossEncoder

MODEL_NAME = "BAAI/bge-reranker-v2-m3"

device = "cuda" if torch.cuda.is_available() else "cpu"

# 1. reranker load
reranker = CrossEncoder(MODEL_NAME, device=device)


# 2. reranking function
def rerank(query, documents, top_k=5):
    """
    query: str
    documents: List[str]
    """

    # (query, doc) pair 생성
    pairs = [[query, doc] for doc in documents]

    # score 계산
    scores = reranker.predict(pairs)

    # score + doc 묶기
    ranked = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)

    return ranked[:top_k]

query = "What is panda?"

docs = [
    "hello world",
    "Pandas are bear species native to China.",
    "Apple is a tech company",
    "Pandas mainly eat bamboo."
]

results = rerank(query, docs, top_k=3)

for doc, score in results:
    print(score, doc)