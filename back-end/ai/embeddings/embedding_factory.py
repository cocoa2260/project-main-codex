from ai.embeddings.embedding_provider import (HFEmbeddingProvider)

from pathlib import Path

"""
지원 가능한 Embedding Registry
새 모델 추가 시 여기만 수정
"""

EMBEDDING_REGISTRY = {
    "snowflake-ko": {
        "base_model": "dragonkue/snowflake-arctic-embed-l-v2.0-ko",
    },

    "snowflake-ko-lora": {
        "base_model": "skdiwlsdn5/snowflake-Lora-512",
    },
}

_provider_cache = {}


def resolve_embedding_model(model_name: str | None) -> str:
    if model_name in EMBEDDING_REGISTRY:
        return model_name

    return next(iter(EMBEDDING_REGISTRY))


def get_embedding_provider(model_name: str):
    model_name = resolve_embedding_model(model_name)

    if model_name in _provider_cache:
        return _provider_cache[
            model_name
        ]

    config = EMBEDDING_REGISTRY[
        model_name
    ]
    
    provider = HFEmbeddingProvider(
        model_name=config["base_model"],
    )

    _provider_cache[
        model_name
    ] = provider

    return provider
