import logging
import json
import re
from typing import Dict, TypedDict, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END
from app.core.llm_provider import get_llm

from app.schemas.analysis_schema import Issue, AnalysisSummary, AnalysisResult, BoundingBox
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ================================================================
# SCHEMA UNIFICADO: Issues + Summary em UMA única resposta
# ================================================================
class UnclassifiedIssue(BaseModel):
    title: str = Field(description="Título curto da anomalia.")
    description: str = Field(description="Descrição técnica concisa.")
    severity: str = Field(description="'Critical' ou 'Mild'.")
    clause_reference: str = Field(description="Referência à cláusula (ex: 'Cláusula Oitava').")
    paragraph_id: Optional[str] = Field(default=None, description="ID exato do parágrafo (ex: 'P12'). DEVE ser null se for omissão.")
    is_omission: bool = Field(default=False, description="True se a cláusula NÃO EXISTE no documento.")
    category: str = Field(description="Literal: 'DREI', 'CNAE', 'Capital', 'Governança', 'Ortografia', ou 'Inconsistência'.")
    suggested_fix: Optional[str] = Field(default=None, description="Texto sugerido para correção (máx 500 chars).")

class FullAnalysisResult(BaseModel):
    """Resposta unificada: issues + summary em uma única chamada LLM."""
    executive_summary: str = Field(description="Parecer narrativo em 3 parágrafos (Introdução, Problemas, Conclusão). Use \\n\\n entre parágrafos.")
    risk_level: str = Field(description="'Low', 'Medium' ou 'High'.")
    issues: List[UnclassifiedIssue] = Field(description="Lista de problemas encontrados (máximo 25).")

class WorkflowState(TypedDict):
    document_context: dict 
    cleaned_text: str
    raw_issues: List[UnclassifiedIssue]
    issues: List[Issue]
    summary: AnalysisSummary
    score: int
    final_result: AnalysisResult


def _smart_truncate(text: str, max_chars: int = 120000) -> str:
    """Truncamento inteligente que preserva início + fim do documento.
    Cláusulas obrigatórias (foro, desimpedimento) ficam nas últimas páginas."""
    if len(text) <= max_chars:
        return text
    head_size = int(max_chars * 0.80)
    tail_size = max_chars - head_size
    result = (
        text[:head_size] + 
        "\n\n[... SEÇÃO INTERMEDIÁRIA OMITIDA POR LIMITE ...]\n\n" + 
        text[-tail_size:]
    )
    logger.warning(
        f"Texto truncado: {len(text)} → ~{max_chars} chars "
        f"(head={head_size}, tail={tail_size})"
    )
    return result


# ================================================================
# NÓ ÚNICO DE ANÁLISE (substitui CleanText + DetectIssues + Summary)
# ================================================================
def unified_analysis_node(state: WorkflowState) -> WorkflowState:
    """Análise UNIFICADA em uma ÚNICA chamada LLM.
    Detecta issues, classifica e gera resumo executivo — tudo de uma vez.
    Elimina 2 chamadas LLM extras, cortando o tempo pela metade."""
    
    text = state["document_context"]["clean_text_for_llm"]
    text_for_llm = _smart_truncate(text)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "Você é um Analista Societário Sênior atuando em um Escritório de Contabilidade.\n"
            "Sua missão é auditar este contrato social/alteração contratual e produzir um parecer completo.\n\n"
            
            "═══════════════════════════════════════════════════════════\n"
            "  REGRA SUPREMA — ANTI-ALUCINAÇÃO (LEIA ANTES DE TUDO)\n"
            "═══════════════════════════════════════════════════════════\n"
            "ANTES de reportar QUALQUER omissão, você DEVE:\n"
            "1. Ler o documento INTEIRO de ponta a ponta, incluindo as ÚLTIMAS cláusulas.\n"
            "2. Procurar não apenas pelo título exato, mas por SINÔNIMOS e EQUIVALÊNCIAS SEMÂNTICAS.\n"
            "   Exemplo: a declaração de desimpedimento pode estar em 'DA ADMINISTRAÇÃO',\n"
            "   'DO ADMINISTRADOR', 'VIGÉSIMA NONA', etc. O texto pode dizer 'declara, sob as penas da lei,\n"
            "   que não está impedido' sem usar a palavra 'desimpedimento' no título.\n"
            "3. A cláusula de foro pode estar em 'CLÁUSULA TRIGÉSIMA', 'DO FORO', 'FORO E JURISDIÇÃO',\n"
            "   ou simplesmente conter 'o foro para (...) permanece em [CIDADE]'.\n"
            "4. O exercício social pode estar descrito junto ao balanço, em 'CLÁUSULA VIGÉSIMA',\n"
            "   ou mencionar '1º de janeiro a 31 de dezembro' em qualquer cláusula.\n"
            "5. Somente após verificar TODO o texto e confirmar com 100%% de certeza que NÃO existe\n"
            "   nenhum trecho equivalente, você pode classificar como is_omission=true.\n"
            "6. Se existir QUALQUER dúvida, NÃO reporte como omissão.\n\n"

            "CHECKLIST (busque em TODO o texto antes de reportar omissão):\n"
            "• Desimpedimento → 'não está impedido', 'penas da lei', 'condenação criminal'\n"
            "• Foro → 'foro', 'comarca', 'jurisdição', 'permanece em'\n"
            "• Exercício social → 'exercício social', 'balanço', '1º de janeiro', '31 de dezembro'\n"
            "• Objeto social → atividades da empresa, CNAEs\n"
            "• Capital social → 'capital social', 'quotas', 'integralização'\n\n"

            "CATEGORIAS DE ANÁLISE (verifique TODAS):\n"
            "1. DREI: Cláusulas obrigatórias para registro na Junta Comercial.\n"
            "2. CNAE: Objeto social vs. enquadramento tributário.\n"
            "3. Capital: Integralização, prazos, forma.\n"
            "4. Governança: Exercício social, balanço, distribuição de lucros.\n"
            "5. Ortografia: Erros ortográficos, acentuação, concordância. Agrupe erros repetitivos.\n"
            "6. Inconsistência: Dados contraditórios (CPF, nomes, percentuais que não somam 100%%).\n\n"
            
            "REGRAS DE RESPOSTA:\n"
            "- Máximo 25 issues, priorizando Critical antes de Mild.\n"
            "- suggested_fix: máximo 500 caracteres.\n"
            "- executive_summary: Parecer narrativo em 3 parágrafos (Introdução, Problemas, Conclusão).\n"
            "  Use \\n\\n entre cada parágrafo.\n"
            "- risk_level: 'Low' se poucos ou nenhum problema, 'Medium' se problemas menores, 'High' se Critical.\n\n"
            
            "ATENÇÃO ESTRUTURAL: O arquivo possui [ID: PX] para mapeamento.\n"
            "- Problema em texto existente → paragraph_id = 'PX' exato, is_omission = false.\n"
            "- Cláusula AUSENTE (confirmada 100%%) → paragraph_id = null, is_omission = true.\n"
        )),
        ("user", "Analise o contrato completo abaixo:\n\n{text}")
    ])
    
    chain = prompt | get_llm(task="analyze").with_structured_output(FullAnalysisResult)
    try:
        result = chain.invoke({"text": text_for_llm})
        logger.info(f"UnifiedAnalysis: {len(result.issues)} issues, risk={result.risk_level}")
        return {
            "raw_issues": result.issues,
            "summary": AnalysisSummary(
                executive_summary=result.executive_summary,
                risk_level=result.risk_level if result.risk_level in ["Low", "Medium", "High"] else "Medium"
            ),
            "cleaned_text": text  # Texto original sem marcadores para o editor
        }
    except Exception as e:
        logger.error(f"Erro no UnifiedAnalysis - tentando fallback: {e}")
        # Fallback: tenta extrair o JSON bruto da mensagem de erro
        try:
            error_str = str(e)
            json_match = re.search(r'\{.*"issues"\s*:\s*\[.*\].*\}', error_str, re.DOTALL)
            if json_match:
                raw_json = json.loads(json_match.group())
                parsed = FullAnalysisResult(**raw_json)
                logger.info(f"UnifiedAnalysis (fallback): {len(parsed.issues)} issues recuperadas")
                return {
                    "raw_issues": parsed.issues,
                    "summary": AnalysisSummary(
                        executive_summary=parsed.executive_summary,
                        risk_level=parsed.risk_level if parsed.risk_level in ["Low", "Medium", "High"] else "Medium"
                    ),
                    "cleaned_text": text
                }
        except Exception as fallback_err:
            logger.error(f"Fallback também falhou: {fallback_err}")
        
        return {
            "raw_issues": [],
            "summary": AnalysisSummary(
                executive_summary="Análise temporariamente indisponível. Tente novamente.",
                risk_level="High"
            ),
            "cleaned_text": text
        }


# ================================================================
# NÓ DETERMINÍSTICO: Converte raw_issues → Issues finais com BBoxes
# ================================================================
def classify_issues_node(state: WorkflowState) -> WorkflowState:
    """Nó DETERMINÍSTICO (zero IA): converte raw_issues em Issues finais e injeta BBoxes do Parser."""
    raw_issues = state.get("raw_issues", [])
    if not raw_issues:
        return {"issues": []}
    
    mapping = state["document_context"]["paragraph_mapping"]
    final_issues = []
    
    for raw in raw_issues:
        bbox_data = None
        
        if not raw.is_omission and raw.paragraph_id and raw.paragraph_id.strip():
            pid = raw.paragraph_id.strip()
            if pid in mapping:
                spatial_data = mapping[pid]
                if spatial_data:
                    bbox_data = BoundingBox(**spatial_data)
                    logger.info(f"Issue '{raw.title}' -> mapeada para {pid}")
            else:
                logger.warning(f"Issue '{raw.title}' -> paragraph_id '{pid}' não encontrado no mapping")
        elif raw.is_omission:
            logger.info(f"Issue '{raw.title}' -> OMISSÃO detectada, sem highlight")
        
        severity = "Critical" if raw.severity and raw.severity.lower() == "critical" else "Mild"
        valid_cats = ["DREI", "CNAE", "Capital", "Governança", "Ortografia", "Inconsistência"]
        cat = raw.category if raw.category in valid_cats else "DREI"

        issue = Issue(
            id=f"issue_{len(final_issues) + 1}",
            title=raw.title,
            description=raw.description,
            severity=severity,
            clause_reference=raw.clause_reference,
            bounding_box=bbox_data,
            category=cat,
            suggested_fix=raw.suggested_fix,
            is_omission=raw.is_omission
        )
        final_issues.append(issue)
    
    logger.info(f"ClassifyNode: {len(final_issues)} issues finalizadas")
    return {"issues": final_issues}


# ================================================================
# NÓ DETERMINÍSTICO: Calcula score baseado em issues + risk_level
# ================================================================
def calculate_score_node(state: WorkflowState) -> WorkflowState:
    issues = state.get("issues", [])
    summary = state["summary"]
    
    score = 100
    for issue in issues:
        score -= 15 if issue.severity == "Critical" else 4
    
    # Consistência: score deve refletir o risk_level
    if summary.risk_level == "High" and score > 50:
        score = min(score, 45)
    elif summary.risk_level == "Medium" and score > 80:
        score = min(score, 72)
    elif summary.risk_level == "Low" and score < 70:
        score = max(score, 70)
    
    score = max(0, min(100, score))
    
    final_result = AnalysisResult(
        document_health_score=score,
        summary=summary,
        issues=state["issues"],
        original_text=state.get("cleaned_text") or state.get("document_context", {}).get("clean_text_for_llm", "")
    )
    return {"score": score, "final_result": final_result}


# ================================================================
# GRAFO OTIMIZADO: 1 chamada LLM + 2 nós determinísticos
# ================================================================
# ANTES: CleanText(LLM) → Detect(LLM) → Classify → Summary(LLM) → Score  = 3 LLM calls
# AGORA: UnifiedAnalysis(LLM) → Classify → Score                          = 1 LLM call
# ================================================================
workflow = StateGraph(WorkflowState)
workflow.add_node("UnifiedAnalysisNode", unified_analysis_node)
workflow.add_node("ClassifyIssuesNode", classify_issues_node)
workflow.add_node("CalculateScoreNode", calculate_score_node)

workflow.set_entry_point("UnifiedAnalysisNode")
workflow.add_edge("UnifiedAnalysisNode", "ClassifyIssuesNode")
workflow.add_edge("ClassifyIssuesNode", "CalculateScoreNode")
workflow.add_edge("CalculateScoreNode", END)

ai_contract_reviewer = workflow.compile()

async def run_analysis_workflow(document_context: dict) -> AnalysisResult:
    initial_state = {
        "document_context": document_context,
        "cleaned_text": "",
        "raw_issues": [],
        "issues": [],
        "summary": None,
        "score": 100,
        "final_result": None
    }
    final_state = await ai_contract_reviewer.ainvoke(initial_state)
    return final_state["final_result"]
