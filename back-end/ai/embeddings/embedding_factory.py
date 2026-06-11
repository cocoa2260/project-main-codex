from ai.embeddings.embedding_provider import (HFEmbeddingProvider)

from pathlib import Path

"""
지원 가능한 Embedding Registry
새 모델 추가 시 여기만 수정
"""

EMBEDDING_REGISTRY = {
    # "nomic-embed-text": {
    #     OllamaEmbeddingProvider,
    #     "adapter_path": None,
    # },
    # "bge-m3": {
    #     OllamaEmbeddingProvider,
    #     "adapter_path": None,
    # },
    # "e5-large": {
    #     OllamaEmbeddingProvider,
    #     "adapter_path": None,
    # },

    "snowflake-ko": {
        "base_model": "dragonkue/snowflake-arctic-embed-l-v2.0-ko",
        "adapter_path": None,
    },

    "snowflake-ko-lora": {
        "base_model": "dragonkue/snowflake-arctic-embed-l-v2.0-ko",
        "adapter_path": Path(__file__).resolve().parent / "models/adapter",
    },
}

_provider_cache = {}

def get_embedding_provider(model_name: str):

    if model_name in _provider_cache:
        return _provider_cache[
            model_name
        ]

    config = EMBEDDING_REGISTRY[
        model_name
    ]
    
    provider = HFEmbeddingProvider(
        model_name=config["base_model"],
        adapter_path=config["adapter_path"]
    )

    _provider_cache[
        model_name
    ] = provider

    return provider
