import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

router = APIRouter()
logger = logging.getLogger(__name__)

class ChatPayload(BaseModel):
    messages: List[Dict[str, str]]
    document_context: Optional[str] = None

@router.post("/stream")
async def chat_stream(payload: ChatPayload):
    try:
        langchain_messages = []
        for msg in payload.messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                # Injetamos o contexto do documento no system prompt se ele existir
                final_content = content
                if payload.document_context:
                    final_content += f"\n\n[CONTRATO ATUAL PARA ANÁLISE]:\n{payload.document_context}"
                langchain_messages.append(SystemMessage(content=final_content))
            elif role == "assistant":
                langchain_messages.append(AIMessage(content=content))
            else:
                langchain_messages.append(HumanMessage(content=content))

        # Reusing the gpt-4o configuration used in the rest of the application
        llm = ChatOpenAI(model="gpt-4o", temperature=0.7)

        async def generate():
            async for chunk in llm.astream(langchain_messages):
                if chunk.content:
                    yield chunk.content

        return StreamingResponse(generate(), media_type="text/plain")

    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do motor de IA ao iniciar streaming.")
