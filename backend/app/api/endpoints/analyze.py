import logging
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import ValidationError, BaseModel

from app.services.parser_service import parse_document_bytes
from app.ai.workflow import run_analysis_workflow
from app.schemas.analysis_schema import AnalysisResult

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=AnalysisResult, status_code=status.HTTP_200_OK)
async def process_contract_analysis(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="Rejeitado: Corpo vazio.")

    if not os.getenv("OPENAI_API_KEY"):
         raise HTTPException(status_code=500, detail="Rejeição por Integração IA Falha: Chave API ausente no backend.")

    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Impossível parsear buffer.")

    try:
        # Agora o parser service devolve um DocumentContext (contendo mapping e texto cru)
        document_context_obj = await parse_document_bytes(file_bytes, file.filename)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Layer Backend Unstructured OCR explodiu: {str(e)}")

    try:
        # Repassamos o DocumentContext ao LangGraph para ele linkar os problemas graficamente
        logger.info("Engatilhando Workflow de IA Espacial...")
        result_payload = await run_analysis_workflow(document_context_obj.model_dump())
        return result_payload
    except ValidationError as ve:
        raise HTTPException(status_code=500, detail="A Inteligência corrompeu schema formativo. Reinicie.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Layer IA abortada: {str(e)}")

class TextPayload(BaseModel):
    text: str

@router.post("/text", response_model=AnalysisResult, status_code=status.HTTP_200_OK)
async def process_text_analysis(payload: TextPayload):
    if not payload.text or len(payload.text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Texto fornecido é insuficiente para análise.")
    
    if not os.getenv("OPENAI_API_KEY"):
         raise HTTPException(status_code=500, detail="Rejeição por Integração IA Falha: Chave API ausente.")

    # Simulando o DocumentContext que o LangGraph espera, porém otimizado sem Mapping (que seria do Canvas)
    document_context_obj = {
         "clean_text_for_llm": payload.text,
         "paragraph_mapping": {}
    }

    try:
        logger.info("Engatilhando Workflow de IA Puramente Textual...")
        result_payload = await run_analysis_workflow(document_context_obj)
        return result_payload
    except ValidationError as ve:
        raise HTTPException(status_code=500, detail="O parsing LLM falhou com a saída bruta.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Layer Textual IA explodiu: {str(e)}")
