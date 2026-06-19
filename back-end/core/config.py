from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    EMBEDDING_MODEL: str
    EMBEDDING_DIMENSION: int
    SECRET_KEY: str
    DATABASE_URL: str

    OLLAMA_URL: str = "http://ollama:11434"
    DEFAULT_LLM_MODEL: str = "legal-qwen"
    AVAILABLE_LLM_MODELS: str = "legal-qwen"
    USE_MOCK_LLM: bool = True

    class Config:
        env_file = (".env", "env")


settings = Settings()