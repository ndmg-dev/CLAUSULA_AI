import asyncio
from dotenv import load_dotenv
load_dotenv()
from pydantic import BaseModel

class AnalysisSummary(BaseModel):
    executive_summary: str
    risk_level: str

class SummaryGeneration(BaseModel):
    summary: AnalysisSummary

async def main():
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        llm = ChatOpenAI(model="gpt-4o", temperature=0)
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Produza o Resumo Jurídico IA final validando os riscos catalogados frente ao texto original.\n"
                       "OBRIGATÓRIO: Separe o seu resumo em pelo menos 3 parágrafos distintos (1. Introdução, 2. Problemas Principais, 3. Conclusão/Risco), utilizando quebras de linha (\\n) entre eles."),
            ("user", "Problemas:\nNenhum\n\nExceto do Contrato:\nNormal")
        ])
        chain = prompt | llm.with_structured_output(SummaryGeneration)
        res = await chain.ainvoke({})
        print("Success:", res)
    except Exception as e:
        print("Crash:", str(e))

asyncio.run(main())
