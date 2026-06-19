import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from db.session import get_db
from services.chat_service import generate_rag_stream

router = APIRouter()


@router.websocket("/{document_id}/stream")
async def chat_websocket_stream(
    websocket: WebSocket,
    document_id: str,
    db: Session = Depends(get_db),
):
    await websocket.accept()

    try:
        while True:
            raw_data = await websocket.receive_text()

            try:
                data = json.loads(raw_data)
                user_message = data.get("message", "")
            except json.JSONDecodeError:
                user_message = raw_data

            async for event in generate_rag_stream(
                user_message=user_message,
                document_id=document_id,
                db=db,
            ):
                await websocket.send_text(event)

    except WebSocketDisconnect:
        print("WebSocket 연결 종료")