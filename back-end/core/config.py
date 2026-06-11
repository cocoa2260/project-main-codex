from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    EMBEDDING_MODEL: str
    EMBEDDING_DIMENSION: int
    SECRET_KEY:str
    DATABASE_URL:str
    OLLAMA_URL:str
    DEFAULT_LLM_MODEL: str
    AVAILABLE_LLM_MODELS: str

    class Config:
        env_file=(".env", "env")

settings = Settings()
