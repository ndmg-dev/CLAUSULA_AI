import logging
from typing import Dict, TypedDict, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END
from app.core.llm_provider import get_llm

from app.schemas.analysis_schema import Issue, AnalysisSummary, AnalysisResult, BoundingBox
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class UnclassifiedIssue(BaseModel):
    title: str = Field(description="Título curto da anomalia jurídica.")
    description: str = Field(description="Descrição técnica.")
    severity: str = Field(description="Classificação de gravidade: 'Critical' para riscos de alta monta financeira, compliance ou registro na Junta; 'Mild' para inconsistências menores.")
    clause_reference: str = Field(description="A qual cláusula ou seção isso se refere.")
    paragraph_id: Optional[str] = Field(default=None, description="O ID exato do parágrafo onde a falha reside (ex: 'P12'). DEVE ser null/None se o problema for uma OMISSÃO ou AUSÊNCIA de cláusula — nunca invente coordenadas para algo que não existe no texto.")
    is_omission: bool = Field(default=False, description="True se o problema é a AUSÊNCIA/OMISSÃO de uma cláusula que deveria existir. False se o problema está em um texto que realmente existe no documento.")
    category: str = Field(description="Obrigatório usar UMA dessas 6 literais exatas: 'DREI', 'CNAE', 'Capital', 'Governança', 'Ortografia', ou 'Inconsistência'.")
    suggested_fix: Optional[str] = Field(default=None, description="Texto COMPLETO sugerido pela IA para inserir ou substituir no documento original. Forneça o texto limpo, pronto para ser copiado-e-colado. Traga o texto da cláusula inteira.")

class RawIssuesExtraction(BaseModel):
    issues: List[UnclassifiedIssue]

class SummaryGeneration(BaseModel):
    summary: AnalysisSummary

class WorkflowState(TypedDict):
    """Estado do Graph inclui agora a base de navegação de contexto para acoplar os highlights (BBoxes) interceptados."""
    document_context: dict 
    cleaned_text: str       # Texto limpo pela Lavanderia IA (sem ruídos de OCR)
    raw_issues: List[UnclassifiedIssue]
    issues: List[Issue]
    summary: AnalysisSummary
    score: int
    final_result: AnalysisResult



def clean_text_node(state: WorkflowState) -> WorkflowState:
    """Lavanderia de Texto: remove ruídos de OCR, marcadores [ID: PX], numeração de página
    e reorganiza o conteúdo em parágrafos fluidos prontos para edição."""
    raw_text = state["document_context"].get("clean_text_for_llm", "")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "Você é um formatador profissional de documentos jurídicos.\n"
            "Receba o texto bruto extraído por OCR de um contrato e devolva APENAS o conteúdo textual puro do contrato.\n\n"
            "REGRAS OBRIGATÓRIAS:\n"
            "1. Remova TODOS os metadados de escaneamento: marcadores [ID: P0], [ID: P1], etc.\n"
            "2. Remova números de página isolados, cabeçalhos repetidos, rodapés e marcas d'água.\n"
            "3. Corrija quebras de linha artificiais — unifique linhas que formam o mesmo parágrafo.\n"
            "4. Mantenha a hierarquia de Cláusulas (ex: 'CLÁUSULA PRIMEIRA', 'CLÁUSULA SEGUNDA').\n"
            "5. Retorne SOMENTE o texto limpo, sem explicações, sem prefixos, sem marcadores adicionais."
        )),
        ("user", "Texto bruto do OCR:\n\n{raw_text}")
    ])
    
    try:
        llm = get_llm(task="clean")
        response = llm.invoke(prompt.format_messages(raw_text=raw_text[:80000]))
        cleaned = response.content.strip()
        logger.info(f"CleanTextNode: texto limpo com {len(cleaned)} chars (original: {len(raw_text)} chars)")
        return {"cleaned_text": cleaned}
    except Exception as e:
        logger.error(f"CleanTextNode falhou, usando texto original: {e}")
        return {"cleaned_text": raw_text}


def detect_issues_node(state: WorkflowState) -> WorkflowState:
    """Detecta E classifica issues em uma única chamada LLM para garantir consistência de índices."""
    text = state["document_context"]["clean_text_for_llm"]  # Usa o texto COM os [ID: PX] para mapeamento
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "Você é um Analista Societário Sênior atuando em um Escritório de Contabilidade.\n"
            "Sua única missão é auditar este contrato social/alteração contratual visando exclusivamente o registro sem exigências na Junta Comercial (IN DREI) e viabilidade tributária.\n\n"
            
            "═══════════════════════════════════════════════════════════\n"
            "  REGRA SUPREMA — ANTI-ALUCINAÇÃO (LEIA ANTES DE TUDO)\n"
            "═══════════════════════════════════════════════════════════\n"
            "Antes de reportar QUALQUER omissão, você DEVE:\n"
            "1. Ler o documento INTEIRO de ponta a ponta, incluindo as ÚLTIMAS cláusulas.\n"
            "2. Procurar não apenas pelo título exato, mas por SINÔNIMOS e EQUIVALÊNCIAS SEMÂNTICAS.\n"
            "   Exemplo: a declaração de desimpedimento pode estar em uma cláusula chamada 'DA ADMINISTRAÇÃO',\n"
            "   'DO ADMINISTRADOR', 'VIGÉSIMA NONA', etc. O texto pode dizer 'declara, sob as penas da lei,\n"
            "   que não está impedido' sem usar a palavra 'desimpedimento' no título.\n"
            "3. A cláusula de foro pode estar em 'CLÁUSULA TRIGÉSIMA', 'DO FORO', 'FORO E JURISDIÇÃO',\n"
            "   ou simplesmente conter 'o foro para (...) permanece em [CIDADE]'.\n"
            "4. Somente após verificar TODO o texto e confirmar com 100%% de certeza que NÃO existe\n"
            "   nenhum trecho equivalente, você pode classificar como is_omission=true.\n"
            "5. Se existir dúvida, NÃO reporte como omissão. Falsos positivos são PIORES que falsos negativos.\n\n"

            "CHECKLIST DE VERIFICAÇÃO OBRIGATÓRIA (verifique cada item contra o texto completo):\n"
            "• Declaração de desimpedimento do administrador → busque por: 'não está impedido', 'penas da lei',\n"
            "  'desimpedimento', 'condenação criminal', 'impedido de exercer'.\n"
            "• Cláusula de foro → busque por: 'foro', 'comarca', 'jurisdição', 'foro para',\n"
            "  'permanece em', 'fica eleito o foro'.\n"
            "• Exercício social → busque por: 'exercício social', 'balanço patrimonial', '1º de janeiro',\n"
            "  '31 de dezembro'.\n"
            "• Objeto social → busque pela cláusula que descreve as atividades da empresa.\n"
            "• Capital social → busque por: 'capital social', 'quotas', 'integralização'.\n\n"

            "PROCURAR ATIVAMENTE PELAS SEGUINTES 'DORES' CONTÁBEIS:\n"
            "1. Regras da Junta Comercial (DREI): Omissão de cláusulas obrigatórias para registro de Limitadas (ex: declaração de desimpedimento do administrador, foro, responsabilidade solidária).\n"
            "2. Objeto Social vs. CNAE: Ambiguidade no objeto social que possa dificultar o enquadramento tributário municipal/nacional ou a obtenção de alvarás.\n"
            "3. Capital Social: Falta de clareza explícita sobre a forma de integralização do capital (moeda corrente, bens) e o prazo exato para tal.\n"
            "4. Governança Contábil: Ausência ou má redação das cláusulas de 'Exercício Social', levantamento do Balanço Patrimonial e Distribuição de Lucros/Pró-labore (especialmente a previsão crucial de possível distribuição de lucros desproporcionais).\n"
            "5. Ortografia e Gramática: Erros ortográficos, gramática incorreta, acentuação errada, concordância verbal/nominal incorreta, pontuação inadequada. Inclua também nomes próprios grafados de forma diferente ao longo do documento, números escritos por extenso que não batem com o valor numérico, e palavras repetidas ou faltantes.\n"
            "6. Inconsistências Documentais: Dados contraditórios dentro do mesmo documento (ex: nome do sócio grafado de formas diferentes, CPF mencionado mais de uma vez com dígitos divergentes, endereço incompleto ou conflitante entre cláusulas, percentuais de participação que não somam 100%%, datas que se contradizem, referências a cláusulas inexistentes).\n\n"
            "CLASSIFICAÇÃO DE SEVERIDADE (você DEVE classificar cada issue):\n"
            "- 'Critical': riscos de alta monta financeira, compliance ou que impedem registro na Junta Comercial.\n"
            "- 'Mild': inconsistências documentais, erros ortográficos ou problemas menores de formatação.\n\n"
            "CLASSIFICAÇÃO DE CATEGORIA (use EXATAMENTE uma destas 6 literais):\n"
            "- 'DREI': problemas relacionados a exigências da Junta Comercial\n"
            "- 'CNAE': problemas de enquadramento tributário ou objeto social\n"
            "- 'Capital': problemas na estrutura de capital social\n"
            "- 'Governança': problemas de governança societária\n"
            "- 'Ortografia': erros ortográficos, gramaticais ou de pontuação\n"
            "- 'Inconsistência': dados contraditórios ou incoerentes dentro do documento\n\n"
            "ATENÇÃO ESTRUTURAL: O arquivo possui identificadores de parágrafos no formato [ID: PX].\n"
            "Regras de paragraph_id:\n"
            "- Se o problema está EM um texto que EXISTE no documento, retorne o paragraph_id exato (Ex: 'P4').\n"
            "- Se o problema é uma OMISSÃO ou AUSÊNCIA (a cláusula NÃO EXISTE no documento), retorne paragraph_id como null e is_omission como true.\n"
            "  NUNCA invente coordenadas ou aponte para outro trecho quando a cláusula está faltando.\n"
            "  Exemplos de omissão: 'Ausência de cláusula de foro', 'Falta de declaração de desimpedimento'.\n"
            "  Nestes casos, paragraph_id DEVE ser null.\n\n"
            "LEMBRETE FINAL: Você está analisando o DOCUMENTO COMPLETO. As cláusulas finais (Vigésima Oitava,\n"
            "Vigésima Nona, Trigésima, etc.) frequentemente contêm itens obrigatórios como desimpedimento e foro.\n"
            "NÃO as ignore."
        )),
        ("user", "Texto Original (Mapeado por IA Vision):\n\n{text}")
    ])
    
    chain = prompt | get_llm(task="analyze").with_structured_output(RawIssuesExtraction)
    try:
        result = chain.invoke({"text": text[:90000]})
        return {"raw_issues": result.issues}
    except Exception as e:
        logger.error(f"Erro Crítico - DetectIssuesNode: {e}")
        return {"raw_issues": []}

def classify_issues_node(state: WorkflowState) -> WorkflowState:
    """Nó DETERMINÍSTICO (zero IA): converte raw_issues em Issues finais e injeta BBoxes do Parser.
    Nenhuma chamada LLM aqui — a classificação de severity já veio do detect_issues_node.
    Isso GARANTE que o índice de raw_issues[i] sempre corresponde ao issue[i] correto."""
    raw_issues = state.get("raw_issues", [])
    if not raw_issues:
        return {"issues": []}
    
    mapping = state["document_context"]["paragraph_mapping"]
    final_issues = []
    
    for raw in raw_issues:
        bbox_data = None
        
        # Regra de Ouro: se é omissão ou paragraph_id é nulo, JAMAIS atribuir bbox
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
        
        # Normaliza severity para valores válidos
        severity = "Critical" if raw.severity and raw.severity.lower() == "critical" else "Mild"
        
        # Garante a tipagem de category para não quebrar a spec Pydantic / UI
        valid_cats = ["DREI", "CNAE", "Capital", "Governança", "Ortografia", "Inconsistência"]
        cat = raw.category if raw.category in valid_cats else "DREI"

        issue = Issue(
            id=f"issue_{raw_issues.index(raw) + 1}",
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
    
    logger.info(f"ClassifyNode: {len(final_issues)} issues processadas, {sum(1 for i in final_issues if i.bounding_box)} com bbox")
    return {"issues": final_issues}

def generate_summary_node(state: WorkflowState) -> WorkflowState:
    text = state.get("cleaned_text") or state["document_context"]["clean_text_for_llm"]
    issues = state.get("issues", [])
    issues_str = "\\n".join([f"- {i.title} (Severity: {i.severity})" for i in issues])
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Produza o Resumo Executivo final validando os riscos catalogados frente ao texto original.\n"
                   "Escreva no modelo de um Parecer Narrativo formal contendo 3 parágrafos lógicos (Introdução, Problemas, Conclusão). "
                   "USE OBRIGATORIAMENTE duas quebras de linha (\\n\\n) entre cada parágrafo para garantir a legibilidade."),
        ("user", "Problemas Detectados:\n{issues}\n\nExceto do Contrato Original:\n{text}")
    ])
    
    chain = prompt | get_llm(task="summary").with_structured_output(SummaryGeneration)
    try:
        result = chain.invoke({"issues": issues_str, "text": text[:60000]})
        return {"summary": result.summary}
    except Exception as e:
        import traceback
        with open("error_trace.log", "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())
        return {"summary": AnalysisSummary(executive_summary="Resumo Temporariamente Indisponível.", risk_level="High")}

def calculate_score_node(state: WorkflowState) -> WorkflowState:
    issues = state.get("issues", [])
    score = 100
    for issue in issues:
        score -= 15 if issue.severity == "Critical" else 4
    score = max(0, min(100, score))
    
    final_result = AnalysisResult(
        document_health_score=score,
        summary=state["summary"],
        issues=state["issues"],
        # Prioriza o texto limpo da Lavanderia, cai para o raw se falhar
        original_text=state.get("cleaned_text") or state.get("document_context", {}).get("clean_text_for_llm", "")
    )
    return {"score": score, "final_result": final_result}

workflow = StateGraph(WorkflowState)
workflow.add_node("CleanTextNode", clean_text_node)        # Lavanderia OCR
workflow.add_node("DetectIssuesNode", detect_issues_node)
workflow.add_node("ClassifyIssuesNode", classify_issues_node)
workflow.add_node("GenerateSummaryNode", generate_summary_node)
workflow.add_node("CalculateScoreNode", calculate_score_node)

# ═══════════════════════════════════════════════════════════
# GRAFO PARALELO: CleanText e DetectIssues rodam SIMULTANEAMENTE
# pois ambos leem apenas do document_context (input original)
# ═══════════════════════════════════════════════════════════
workflow.set_entry_point("CleanTextNode")
workflow.add_edge("CleanTextNode", "DetectIssuesNode")
workflow.add_edge("DetectIssuesNode", "ClassifyIssuesNode")
workflow.add_edge("ClassifyIssuesNode", "GenerateSummaryNode")
workflow.add_edge("GenerateSummaryNode", "CalculateScoreNode")
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
