from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.core.llm_provider import get_llm
from langchain_core.prompts import ChatPromptTemplate
from typing import Optional

router = APIRouter()

class RewriteRequest(BaseModel):
    original_text: str
    issue_description: str
    issue_title: str

class RewrittenClause(BaseModel):
    new_clause: str = Field(description="A nova redação sugerida para a cláusula, formulada com rigor técnico B2B.")
    explanation: Optional[str] = Field(description="Breve explicação de como o risco foi mitigado.")

@router.post("/", response_model=RewrittenClause)
async def rewrite_clause(payload: RewriteRequest):
    """
    ÉPICO 2: Resolução Ativa.
    Aciona a LLM para reescrever e despoluir trechos estritos do contrato
    com base nas exigências da Junta Comercial detectadas previamente pelo LangGraph.
    """
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "Você é um Advogado Societário Sênior prestando suporte a uma firma de Auditoria Contábil.\n"
            "Sua tarefa é reescrever uma cláusula de contrato social para consertar o problema apontado, "
            "garantindo aprovação lisa na Junta Comercial e segurança jurídica.\n\n"
            "O retorno OBRIGATORIAMENTE DEVE estar formatado como a exata redação final purificada da cláusula (pronta para substituir a original), "
            "e uma breve explicação do motivo legal para o contador."
        )),
        ("user", "Título do Problema Detectado: {issue_title}\nDescrição/Exigência: {issue_description}\n\nCláusula Original (Problemática):\n{original_text}")
    ])
    
    chain = prompt | get_llm(task="analyze").with_structured_output(RewrittenClause)
    
    try:
        result = await chain.ainvoke({
            "issue_title": payload.issue_title,
            "issue_description": payload.issue_description,
            "original_text": payload.original_text
        })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no LangChain ao reescrever cláusula: {str(e)}")
