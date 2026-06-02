import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from app.core.llm_provider import get_llm
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
                # Injetamos o contexto do documento no system prompt com formatação clara
                final_content = content
                if payload.document_context and payload.document_context.strip():
                    doc_text = payload.document_context.strip()
                    # Trunca documentos muito longos para não estourar limite de tokens
                    if len(doc_text) > 80000:
                        doc_text = doc_text[:60000] + "\n\n[... TRECHO INTERMEDIÁRIO OMITIDO POR LIMITE ...]\n\n" + doc_text[-15000:]
                    
                    final_content += (
                        "\n\n"
                        "══════════════════════════════════════════════════════\n"
                        "  DOCUMENTO WORD ATIVO — FONTE PRIMÁRIA DE VERDADE\n"
                        "══════════════════════════════════════════════════════\n"
                        "O texto abaixo é o contrato social que o usuário está editando AGORA no Microsoft Word.\n"
                        "Use este documento como base para TODAS as suas respostas.\n"
                        "Se o usuário perguntar sobre cláusulas, sócios, capital, objeto social, etc., \n"
                        "consulte ESTE texto — não invente informações.\n\n"
                        f"{doc_text}\n"
                        "══════════════════════════════════════════════════════\n"
                    )
                langchain_messages.append(SystemMessage(content=final_content))
            elif role == "assistant":
                langchain_messages.append(AIMessage(content=content))
            else:
                langchain_messages.append(HumanMessage(content=content))

        # Motor de IA baseado no provider configurado
        llm = get_llm(task="chat")

        async def generate():
            async for chunk in llm.astream(langchain_messages):
                if chunk.content:
                    yield chunk.content

        return StreamingResponse(generate(), media_type="text/plain")

    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do motor de IA ao iniciar streaming.")
