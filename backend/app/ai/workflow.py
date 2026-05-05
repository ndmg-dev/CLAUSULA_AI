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
    suggested_fix: Optional[str] = Field(default=None, description="Texto FINAL da cláusula corrigida — NUNCA instruções. Este texto será inserido diretamente no documento Word pelo botão 'Corrigir Automaticamente'. Deve ser o texto jurídico completo da cláusula reescrita, pronto para uso. Exemplo correto: 'CLÁUSULA DÉCIMA: O exercício social iniciar-se-á em 1º de janeiro e encerrar-se-á em 31 de dezembro de cada ano.' Exemplo ERRADO: 'Revisar a cláusula para incluir o exercício social.'")

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
    Detecta issues, classifica e gera resumo executivo — tudo de uma vez."""
    
    text = state["document_context"]["clean_text_for_llm"]
    text_for_llm = _smart_truncate(text)
    has_paragraph_ids = "[ID: P" in text
    
    # Bloco de mapeamento estrutural: só se o texto tiver marcadores [ID: PX]
    structural_block = ""
    if has_paragraph_ids:
        structural_block = (
            "MAPEAMENTO ESTRUTURAL: O texto contém marcadores [ID: PX].\n"
            "- Se o problema está em texto existente → paragraph_id = 'PX' exato do trecho.\n"
            "- Se é OMISSÃO confirmada → paragraph_id = null.\n\n"
        )
    else:
        structural_block = (
            "MAPEAMENTO: Este texto veio diretamente do Word, sem marcadores de parágrafo.\n"
            "- Defina paragraph_id como null para todas as issues.\n"
            "- Use clause_reference para indicar qual cláusula é afetada (ex: 'Cláusula Oitava').\n\n"
        )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "Você é um Analista Societário Sênior em um Escritório de Contabilidade.\n"
            "Audite o contrato social/alteração contratual abaixo e produza um parecer completo.\n\n"
            
            "══════════════════════════════════════════════════════\n"
            "  REGRA SUPREMA — ANTI-ALUCINAÇÃO\n"
            "══════════════════════════════════════════════════════\n"
            "ANTES de reportar uma omissão (is_omission=true), VOCÊ DEVE:\n"
            "1. Ler o documento INTEIRO, especialmente as ÚLTIMAS cláusulas.\n"
            "2. Buscar SINÔNIMOS e EQUIVALÊNCIAS. Exemplos:\n"
            "   - Desimpedimento pode estar em 'DA ADMINISTRAÇÃO', 'VIGÉSIMA NONA',\n"
            "     ou qualquer trecho com 'declara, sob as penas da lei, que não está impedido'.\n"
            "   - Foro pode estar em 'CLÁUSULA TRIGÉSIMA', 'DO FORO', ou\n"
            "     'o foro para (...) permanece em [CIDADE]'.\n"
            "   - Exercício social pode mencionar '1º de janeiro a 31 de dezembro'\n"
            "     em qualquer cláusula, não necessariamente com o título 'exercício social'.\n"
            "   - Objeto social pode estar em 'DO OBJETO', 'DAS ATIVIDADES', ou\n"
            "     qualquer cláusula listando atividades econômicas/CNAEs.\n"
            "3. SÓ classifique como omissão se tiver 100%% de certeza ABSOLUTA\n"
            "   de que NÃO EXISTE nenhum trecho equivalente em TODO o documento.\n"
            "4. NA DÚVIDA, NÃO reporte como omissão. Falso positivo é PIOR que falso negativo.\n\n"

            "O QUE ANALISAR:\n"
            "1. DREI: Cláusulas obrigatórias para registro na Junta Comercial.\n"
            "2. CNAE: Objeto social vs. enquadramento tributário.\n"
            "3. Capital: Integralização, prazos, forma de pagamento.\n"
            "4. Governança: Exercício social, balanço, distribuição de lucros.\n"
            "5. Ortografia: Erros ortográficos, acentuação, concordância. Agrupe erros repetitivos em uma única issue.\n"
            "6. Inconsistência: Dados contraditórios (CPF, nomes, percentuais que não somam 100%%).\n\n"
            
            "REGRAS DE SEVERIDADE (SEVERITY):\n"
            "- 'Critical': APENAS para erros que impedem registro (DREI, CNAE, Capital Inconsistente) ou geram risco financeiro/legal grave.\n"
            "- 'Mild': OBRIGATÓRIO para erros de 'Ortografia', 'Falta de clareza', formatação ou melhorias de redação. NUNCA classifique problemas textuais ou ortográficos como Critical.\n"
            "- suggested_fix: OBRIGATORIAMENTE texto jurídico FINAL da cláusula corrigida.\n"
            "  Este campo será colado diretamente no documento Word.\n"
            "  CORRETO: 'CLÁUSULA DÉCIMA SEGUNDA: O exercício social terá início em 1º de janeiro...'\n"
            "  ERRADO: 'Revisar a cláusula para incluir...'\n"
            "  ERRADO: 'Incluir uma cláusula específica definindo...'\n"
            "- executive_summary: Parecer em 3 parágrafos (Introdução, Problemas, Conclusão). Use \\n\\n entre eles.\n"
            "- risk_level: 'Low' se o documento está adequado, 'Medium' se há ajustes menores, 'High' se há Critical.\n\n"
            
            + structural_block
        )),
        ("user", "Contrato completo para auditoria:\n\n{text}")
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
# VERIFICADOR DETERMINÍSTICO DE OMISSÕES FALSAS
# Busca keywords no texto original. Se encontrar, rejeita a omissão.
# ================================================================
OMISSION_KEYWORDS = {
    "foro": ["foro", "comarca", "jurisdição", "foro competente", "fica eleito"],
    "desimpedimento": ["não está impedido", "penas da lei", "desimpedimento", "condenação criminal", "impedido de exercer", "impedimento"],
    "exercício social": ["exercício social", "balanço patrimonial", "1º de janeiro", "31 de dezembro", "encerramento do exercício"],
    "objeto social": ["objeto social", "atividades econômicas", "cnae", "atividade principal", "do objeto"],
    "capital social": ["capital social", "integralização", "quotas", "valor nominal"],
    "administração": ["administração", "administrador", "poderes de gestão", "sócio administrador"],
    "distribuição": ["distribuição de lucros", "pró-labore", "dividendos", "lucros e perdas"],
}

def _is_false_omission(issue_title: str, issue_description: str, full_text: str) -> bool:
    """Verifica se uma omissão é falsa buscando keywords no texto original.
    Retorna True se a cláusula EXISTE no documento (logo a omissão é falsa)."""
    text_lower = full_text.lower()
    combined = (issue_title + " " + issue_description).lower()
    
    for topic, keywords in OMISSION_KEYWORDS.items():
        # Checa se esta issue é sobre este tópico
        if topic in combined or any(kw in combined for kw in keywords):
            # Se qualquer keyword deste tópico existe no texto, a omissão é falsa
            for kw in keywords:
                if kw in text_lower:
                    logger.warning(
                        f"OMISSÃO FALSA DETECTADA e REMOVIDA: '{issue_title}' "
                        f"— keyword '{kw}' encontrada no documento"
                    )
                    return True
    return False


# ================================================================
# NÓ DETERMINÍSTICO: Converte raw_issues → Issues finais com BBoxes
# ================================================================
def classify_issues_node(state: WorkflowState) -> WorkflowState:
    """Nó DETERMINÍSTICO (zero IA): converte raw_issues em Issues finais,
    injeta BBoxes do Parser e FILTRA omissões falsas via busca de keywords."""
    raw_issues = state.get("raw_issues", [])
    if not raw_issues:
        return {"issues": []}
    
    mapping = state["document_context"]["paragraph_mapping"]
    full_text = state["document_context"]["clean_text_for_llm"]
    final_issues = []
    filtered_count = 0
    
    for raw in raw_issues:
        # FILTRO ANTI-ALUCINAÇÃO: rejeita omissões falsas
        if raw.is_omission and _is_false_omission(raw.title, raw.description, full_text):
            filtered_count += 1
            continue
        
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
            logger.info(f"Issue '{raw.title}' -> OMISSÃO confirmada (passou verificação)")
        
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
    
    if filtered_count > 0:
        logger.info(f"ClassifyNode: {filtered_count} omissões falsas REMOVIDAS")
    logger.info(f"ClassifyNode: {len(final_issues)} issues finalizadas")
    return {"issues": final_issues}


# ================================================================
# NÓ DETERMINÍSTICO: Calcula score baseado APENAS nas issues reais
# O risk_level é DERIVADO do score — nunca o contrário.
# ================================================================
def calculate_score_node(state: WorkflowState) -> WorkflowState:
    issues = state.get("issues", [])
    summary = state["summary"]
    
    # Score calculado puramente pelas issues detectadas
    score = 100
    for issue in issues:
        if issue.severity == "Critical":
            score -= 15
        else:
            score -= 5
    
    score = max(0, min(100, score))
    
    # risk_level é DERIVADO do score (fonte única de verdade)
    if score >= 80:
        derived_risk = "Low"
    elif score >= 50:
        derived_risk = "Medium"
    else:
        derived_risk = "High"
    
    # Sobrescreve o risk_level da LLM pelo calculado
    corrected_summary = AnalysisSummary(
        executive_summary=summary.executive_summary,
        risk_level=derived_risk
    )
    
    logger.info(
        f"ScoreNode: score={score}, risk={derived_risk} "
        f"(LLM disse '{summary.risk_level}', corrigido para '{derived_risk}'), "
        f"{len(issues)} issues ({sum(1 for i in issues if i.severity == 'Critical')} Critical)"
    )
    
    final_result = AnalysisResult(
        document_health_score=score,
        summary=corrected_summary,
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
