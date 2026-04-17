from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.api.endpoints import analyze, export, rewrite, export_word, vault, esign

# ---------------------------------------------------------
# C L Á U S U L A   A I   -   C O R E   E N T R Y P O I N T
# ---------------------------------------------------------

app = FastAPI(
    title="Cláusula AI - Smart Reviewer API",
    description="Backend services for B2B contract analysis and intelligence. Strict Layered Architecture.",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configuração de CORS (Strict in Prod, Flexible in Dev)
origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,https://localhost:3000")
origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", tags=["System"])
async def health_check():
    """
    Health check base para monitoramento da saúde do serviço.
    Garante que o orquestrador Docker reconheça que a API subiu corretamente.
    """
    return {
        "status": "healthy",
        "service": "Cláusula AI Backend",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "0.1.0"
    }

# =========================================================
# FUTURE ROUTER REGISTRATIONS (Module Injection)
# =========================================================
# As rotas devem ser incluídas sob o prefixo /api/
#
# from app.api.routes import auth, contracts, analysis
# 
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth Firebase"])
# app.include_router(contracts.router, prefix="/api/contracts", tags=["Contracts"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["Smart Analysis"])
app.include_router(export.router, prefix="/api/export", tags=["Export Pipelines"])
app.include_router(export_word.router, prefix="/api/export", tags=["Export Word"])
app.include_router(rewrite.router, prefix="/api/rewrite", tags=["Clause Rewrite"])
app.include_router(vault.router, prefix="/api/vault", tags=["Cloud Vault"])
app.include_router(esign.router, prefix="/api/esign", tags=["E-Signature (ZapSign)"])

# Monta diretório local de arquivos do cofre para download (fallback sem Firebase Storage)
vault_dir = os.path.join(os.getcwd(), "vault_local")
os.makedirs(vault_dir, exist_ok=True)
app.mount("/vault_local", StaticFiles(directory=vault_dir), name="vault_local")
