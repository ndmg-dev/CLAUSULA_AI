import io
import zipfile
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.analysis_schema import AnalysisResult

router = APIRouter()

@router.post("/", response_class=StreamingResponse)
async def export_report(payload: AnalysisResult):
    """
    Endpoint de Geração de ZIP B2B. Recebe o AnalysisResult atual completo do cliente React
    e devolve em StreamingResponse dois arquivos (Excel com Risk Matrix e PDF com Scorecard).
    """
    try:
        import pandas as pd
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        
        # 1. Gerar Arquivo Excel (Matriz de Risco) via OpenPyXL em memória
        excel_buffer = io.BytesIO()
        issues_data = []
        for issue in payload.issues:
            issues_data.append({
                "TÍTULO": issue.title,
                "GRAVIDADE": issue.severity,
                "CLÁUSULA REFERÊNCIA": issue.clause_reference,
                "DESCRIÇÃO TÉCNICA": issue.description
            })
        df = pd.DataFrame(issues_data)
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name="Matriz de Risco", index=False)
        excel_buffer.seek(0)
        
        # 2. Gerar Arquivo PDF (Resumo Executivo) via ReportLab em memória
        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4, title="Laudo Executivo")
        styles = getSampleStyleSheet()
        
        flowables = [
            Paragraph(f"<b>Laudo Executivo - Cláusula AI</b>", styles['Title']),
            Spacer(1, 12),
            Paragraph(f"<b>Score de Sanidade Financeira/Jurídica:</b> {payload.document_health_score}/100", styles['Normal']),
            Paragraph(f"<b>Nível de Risco Identificado:</b> {payload.summary.risk_level.upper()}", styles['Normal']),
            Spacer(1, 24)
        ]
        
        paragraphs = payload.summary.executive_summary.split("\n")
        for p in paragraphs:
            text = p.strip()
            if text:
                flowables.append(Paragraph(text, styles['Normal']))
                flowables.append(Spacer(1, 12))
        
        doc.build(flowables)
        pdf_buffer.seek(0)
        
        # 3. Empacotamento Zip Dinâmico
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            zip_file.writestr("Resumo_Executivo.pdf", pdf_buffer.getvalue())
            zip_file.writestr("Matriz_de_Risco_Full.xlsx", excel_buffer.getvalue())
            
        zip_buffer.seek(0)
        
        return StreamingResponse(
            zip_buffer, 
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=laudos_exportados.zip"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha na esteira de exportação: {str(e)}")
