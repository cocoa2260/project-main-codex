from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from db.session import get_db
from services.chat_service import generate_rag_stream

router = APIRouter()

@router.websocket("/{document_id}/stream")
async def chat_websocket_stream(websocket: WebSocket, document_id: str, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        while True:
            user_message = await websocket.receive_text()

            # RAG 파이프라인 가동!
            async for chunk in generate_rag_stream(user_message, document_id, db):
                await websocket.send_text(chunk)
            
            # (수정) chat_service에서 이미 [DONE]을 보내므로 여기서 중복 발송할 필요가 없습니다.
            
    except WebSocketDisconnect:
        print("연결 종료")