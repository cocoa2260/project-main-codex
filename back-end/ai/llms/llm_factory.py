from ai.llms.llm_provider import OllamaLLMProvider


# 지원 가능한 LLM 모델 목록이다.
# 새 LLM 모델을 추가할 때는 여기에 model_name과 provider만 등록하면 된다.
LLM_REGISTRY = {
    "qwen2.5:0.5b": {
        "provider": OllamaLLMProvider,
    },
    "qwen3:4b": {
        "provider": OllamaLLMProvider,
    },
    "gemma3:4b": {
        "provider": OllamaLLMProvider,
    },
    "legal-qwen": {
        "provider": OllamaLLMProvider,
    },
}

# 같은 모델 provider를 매번 새로 만들지 않기 위한 메모리 캐시다.
_provider_cache = {}


def get_llm_provider(model_name: str):
    # 이미 생성된 provider가 있으면 재사용한다.
    if model_name in _provider_cache:
        return _provider_cache[model_name]

    # env 또는 DB에서 넘어온 모델명이 registry에 없으면 즉시 실패시킨다.
    if model_name not in LLM_REGISTRY:
        raise ValueError(f"지원하지 않는 LLM 모델입니다: {model_name}")

    config = LLM_REGISTRY[model_name]
    provider_cls = config["provider"]

    # registry에 등록된 provider 클래스로 실제 provider 인스턴스를 만든다.
    provider = provider_cls(model_name=model_name)
    _provider_cache[model_name] = provider

    return provider