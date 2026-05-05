"""
llm_provider.py — Camada de Abstração para Motores de IA

Este módulo centraliza a criação de instâncias LLM, permitindo
trocar entre OpenAI, Ollama ou modo Híbrido com uma única variável
de ambiente (LLM_PROVIDER).

Uso:
    from app.core.llm_provider import get_llm
    llm = get_llm(task="analyze")     # OpenAI gpt-4o
    llm = get_llm(task="chat")        # Depende do LLM_PROVIDER
    llm = get_llm(task="clean")       # Modelo leve (Ollama) ou OpenAI
    llm = get_llm(task="summary")     # Modelo pesado (Ollama) ou OpenAI

Variáveis de Ambiente:
    LLM_PROVIDER        = "openai" | "ollama" | "hybrid"
    OPENAI_MODEL        = "gpt-4o" (padrão)
    OLLAMA_BASE_URL     = "http://ollama:11434" (padrão)
    OLLAMA_MODEL_LIGHT  = "llama3.1:8b" (para tarefas simples)
    OLLAMA_MODEL_HEAVY  = "qwen2.5:14b" (para tarefas complexas)
"""

import os
import logging

logger = logging.getLogger(__name__)

# ================================================================
# CONFIGURAÇÃO VIA VARIÁVEIS DE AMBIENTE
# ================================================================
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
OLLAMA_MODEL_LIGHT = os.getenv("OLLAMA_MODEL_LIGHT", "llama3.1:8b")
OLLAMA_MODEL_HEAVY = os.getenv("OLLAMA_MODEL_HEAVY", "qwen2.5:14b")

# Mapeamento de tarefa → temperatura padrão
TASK_TEMPERATURES = {
    "clean": 0,
    "analyze": 0,
    "summary": 0,
    "chat": 0.7,
}

def _get_openai_llm(temperature: float = 0):
    """Instancia ChatOpenAI. Importação lazy para não quebrar se a key não existir."""
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(model=OPENAI_MODEL, temperature=temperature)

def _get_ollama_llm(model: str, temperature: float = 0):
    """Instancia ChatOllama. Importação lazy para não quebrar se Ollama não estiver instalado."""
    try:
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=model,
            base_url=OLLAMA_BASE_URL,
            temperature=temperature,
        )
    except ImportError:
        logger.error(
            "langchain-ollama não está instalado. "
            "Execute: pip install langchain-ollama"
        )
        raise

def get_llm(task: str = "general"):
    """
    Factory central que retorna a LLM correta baseada na tarefa e no provider configurado.
    
    Args:
        task: Tipo de tarefa. Valores aceitos:
            - "clean"   : Lavanderia de texto OCR (leve)
            - "analyze" : Análise jurídica estruturada com structured output (pesada, crítica)
            - "summary" : Geração de resumo executivo (média)
            - "chat"    : Chat streaming do Copiloto (média, temperatura mais alta)
            - "general" : Uso genérico (fallback)
    
    Returns:
        Instância de BaseChatModel (ChatOpenAI ou ChatOllama)
    """
    temperature = TASK_TEMPERATURES.get(task, 0)
    
    # ─── MODO OPENAI (padrão) ─────────────────────────────────
    if LLM_PROVIDER == "openai":
        logger.debug(f"[LLMProvider] task={task} → OpenAI ({OPENAI_MODEL})")
        return _get_openai_llm(temperature)
    
    # ─── MODO OLLAMA (100% local) ─────────────────────────────
    if LLM_PROVIDER == "ollama":
        model = OLLAMA_MODEL_LIGHT if task == "clean" else OLLAMA_MODEL_HEAVY
        logger.debug(f"[LLMProvider] task={task} → Ollama ({model})")
        return _get_ollama_llm(model, temperature)
    
    # ─── MODO HÍBRIDO (Ollama leve + OpenAI crítico) ──────────
    if LLM_PROVIDER == "hybrid":
        if task in ("clean", "chat", "summary"):
            model = OLLAMA_MODEL_LIGHT if task == "clean" else OLLAMA_MODEL_HEAVY
            logger.debug(f"[LLMProvider] task={task} → Ollama ({model}) [hybrid]")
            return _get_ollama_llm(model, temperature)
        else:
            # analyze + general → OpenAI (structured output confiável)
            logger.debug(f"[LLMProvider] task={task} → OpenAI ({OPENAI_MODEL}) [hybrid-critical]")
            return _get_openai_llm(temperature)
    
    # Fallback: se a variável tiver valor desconhecido, usa OpenAI
    logger.warning(f"[LLMProvider] LLM_PROVIDER='{LLM_PROVIDER}' desconhecido, usando OpenAI como fallback")
    return _get_openai_llm(temperature)
