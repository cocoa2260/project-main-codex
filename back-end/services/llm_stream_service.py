import asyncio
import json
from typing import AsyncGenerator

import httpx

from core.config import settings


class LLMStreamError(Exception):
    pass


async def stream_mock_generate(prompt: str) -> AsyncGenerator[str, None]:
    """
    실제 LLM이 준비되기 전까지 사용하는 mock 스트리밍 함수.
    WebSocket, React 출력, DB 저장 흐름을 테스트하기 위한 용도.
    """

    mock_answer = (
        "현재는 학습된 LLM이 연결되지 않은 테스트 모드입니다. "
        "다만 백엔드는 문서를 조회하고, 관련 chunk를 구성한 뒤, "
        "이 응답을 스트리밍 형식으로 반환하고 있습니다. "
        "나중에 Ollama 모델이 준비되면 이 부분만 실제 LLM 호출로 교체하면 됩니다."
    )

    for token in mock_answer.split(" "):
        yield token + " "
        await asyncio.sleep(0.03)


async def stream_ollama_generate(prompt: str) -> AsyncGenerator[str, None]:
    """
    나중에 Ollama 모델이 준비되면 사용할 실제 스트리밍 함수.
    """

    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST",
            f"{settings.OLLAMA_URL}/api/generate",
            json={
                "model": settings.DEFAULT_LLM_MODEL,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": 0.2,
                    "num_ctx": 4096,
                },
            },
        ) as response:
            if response.status_code != 200:
                body = await response.aread()
                error_text = body.decode("utf-8", errors="ignore")
                raise LLMStreamError(
                    f"Ollama 응답 오류: {response.status_code} / {error_text}"
                )

            async for line in response.aiter_lines():
                if not line:
                    continue

                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue

                if data.get("done"):
                    break

                token = data.get("response", "")
                if token:
                    yield token


async def stream_llm_generate(prompt: str) -> AsyncGenerator[str, None]:
    """
    공통 LLM 스트리밍 진입점.
    지금은 mock, 나중에는 Ollama로 자동 전환.(env에도 USE_MOCK_LLM=false 이걸로 바꾸기)
    """

    if settings.USE_MOCK_LLM:
        async for token in stream_mock_generate(prompt):
            yield token
        return

    async for token in stream_ollama_generate(prompt):
        yield token