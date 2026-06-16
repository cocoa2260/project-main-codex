import httpx
from sqlalchemy.orm import Session
# from models import Document # (예시) 실제 DB 모델을 임포트해야 합니다.

COLAB_LLM_URL = "https://caravan-powdery-omen.ngrok-free.dev/generate"

async def generate_rag_stream(user_message: str, document_id: str, db: Session):
    """
    [안정화된 스트리밍 브릿지]
    """
    # 1. 실제 DB에서 문서를 조회하는 로직으로 교체 (동기 ORM 사용 시 주의)
    # document = db.query(Document).filter(Document.id == document_id).first()
    # if not document:
    #     yield "문서를 찾을 수 없습니다.\n[DONE]"
    #     return
    # context_text = document.content
    
    # (임시) 일단 기존 로직을 살려둡니다.
    context_text = "[관련 판례 내용] 피고인은 고의성 없이 영장 발부 사실을 몰랐으므로..."
    
    # 2. QnA 목적에 맞는 프롬프트로 수정
    prompt = f"""당신은 유능한 법률 전문가입니다. 아래 제공된 법률 판례 원문을 바탕으로 사용자의 질문에 정확하고 간결하게 답변해 주세요.
    ### 원본 문서:
    {context_text}
    ### 질문:
    {user_message}
    ### 답변:
    """

    # 3. 통신 시작
    async with httpx.AsyncClient(verify=False, timeout=120.0) as client:
        headers = {"ngrok-skip-browser-warning": "true"}
        
        async with client.stream("POST", COLAB_LLM_URL, json={"prompt": prompt}, headers=headers) as response:
            if response.status_code == 200:
                async for chunk in response.aiter_text():
                    if chunk:
                        yield chunk
                yield "\n[DONE]"
            else:
                yield f"[오류] 서버 응답 코드: {response.status_code}\n[DONE]"