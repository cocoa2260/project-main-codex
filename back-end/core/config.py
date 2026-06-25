from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    EMBEDDING_MODEL: str
    EMBEDDING_DIMENSION: int
    SECRET_KEY: str
    DATABASE_URL: str

    OLLAMA_URL: str = "http://ollama:11434"
    DEFAULT_LLM_MODEL: str = "qwen3:4b"
    DEFAULT_QA_MODEL: str = "qwen-law:latest"
    AVAILABLE_LLM_MODELS: str = "qwen-law:latest, qwen2.5:0.5b, qwen3:4b, gemma3:4b"
    USE_MOCK_LLM: bool = True

    class Config:
        env_file = (".env", "env")


settings = Settings()