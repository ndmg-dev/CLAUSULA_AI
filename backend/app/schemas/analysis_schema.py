from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class BoundingBox(BaseModel):
    page_number: int = Field(description="A página indexada (1-based) do documento onde a anomalia reside.")
    x0: float = Field(description="Borda esquerda normalizada (0.0 até 1.0)")
    y0: float = Field(description="Borda superior normalizada (0.0 até 1.0)")
    x1: float = Field(description="Borda direita normalizada (0.0 até 1.0)")
    y1: float = Field(description="Borda inferior normalizada (0.0 até 1.0)")

class Issue(BaseModel):
    id: str = Field(description="Identificador único da anomalia, gerado sequencialmente ex: 'issue_1'")
    title: str = Field(description="Título curto, direto e claro resumindo a anomalia identificada no contrato.")
    description: str = Field(description="Descrição detalhada e rigorosa do problema e seus impactos no contexto societário ou contábil.")
    severity: Literal["Critical", "Mild"] = Field(description="Classificação exata. 'Critical' para riscos de alta monta financeira ou compliance; 'Mild' para inconsistências documentais ou erros menores.")
    clause_reference: str = Field(description="Referência direta ao número da cláusula ou seção original onde a anomalia reside. Ex: 'Cláusula Oitava'.")
    bounding_box: Optional[BoundingBox] = Field(default=None, description="Coordenadas espaciais providas pelo sistema OCR para alinhar com a UI de highlights.")
    category: Literal["DREI", "CNAE", "Capital", "Governança"] = Field(default="DREI", description="Categoria do insight para mapeamento visual")
    suggested_fix: Optional[str] = Field(default=None, description="Texto sugerido pela IA para inserir ou substituir no documento original.")
    is_omission: bool = Field(default=False, description="Verdadeiro quando a cláusula não existe de fato.")

class AnalysisSummary(BaseModel):
    executive_summary: str = Field(description="Resumo executivo de nível sênior documentando de forma enxuta o status da sanidade do documento após revisão.")
    risk_level: Literal["Low", "Medium", "High"] = Field(description="O nível holístico de risco baseado no volume e peso das issues detectadas.")

class AnalysisResult(BaseModel):
    document_health_score: int = Field(description="Score que reflete a saúde geral do contrato, partindo de 100 e decaindo progressivamente pelas gravidades dos issues.")
    summary: AnalysisSummary = Field(description="Conclusão executiva global.")
    issues: List[Issue] = Field(description="Rol de problemas individuais acompanhados de suas âncoras espaciais.")
    original_text: Optional[str] = Field(default=None, description="O texto cru extraído do documento original, que servirá de base (raw_content) para o Tiptap Editor no Frontend")
