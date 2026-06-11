from ai.rerankers.base import ( BaseRerankerProvider )
from ai.rerankers.reranking_provider import ( HFRerankingProvider )

RERANKING_REGISTRY = {
    "BAAI/bge-m3": {
        "base_model": "BAAI/bge-reranker-v2-m3",
    }
}

_provider_cache = {}

def get_reranker_provider(model_name: str):
    if model_name in _provider_cache:
        return _provider_cache[
            model_name
        ]

    config = EMBEDDING_REGISTRY[
        model_name
    ]

    provider = HFRerankingProvider(
        model_name=config["base_model"],
        adapter_path=config["adapter_path"]
    )

    _provider_cache[
        model_name
    ] = provider

    return provider