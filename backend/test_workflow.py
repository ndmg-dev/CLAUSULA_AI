import asyncio
from dotenv import load_dotenv
load_dotenv()

from app.ai.workflow import run_analysis_workflow

async def main():
    doc_context = {
        "raw_text": "Sociedade Limitada RPS Servicos de Apoio Administrativo LTDA.",
        "clean_text_for_llm": "Sociedade Limitada RPS Servicos de Apoio Administrativo LTDA.",
        "paragraph_mapping": {"P1": {"x0": 0.1, "y0": 0.1, "x1": 0.2, "y1": 0.2, "page_number": 1}}
    }
    res = await run_analysis_workflow(doc_context)
    print("FINISHED WORKFLOW")
    print(res.summary.executive_summary)

asyncio.run(main())
