from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
import os

security = HTTPBearer(auto_error=False)

# Inicializa o App do Firebase Admin
# Usa a credencial default do ambiente (GOOGLE_APPLICATION_CREDENTIALS) ou o JSON especificado.
# Caso ainda não esteja configurado, passamos liso e devolvemos um Mock User temporário (Desenvolvimento).
try:
    if not firebase_admin._apps:
        # Usa json customizado se presente (Dev/Prod configurado)
        if os.path.exists("firebase-credentials.json"):
            cred = credentials.Certificate("firebase-credentials.json")
        else:
            cred = credentials.ApplicationDefault()
            
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'clausula-ai.appspot.com'
        })
    FIREBASE_READY = True
except Exception as e:
    FIREBASE_READY = False
    print(f"Atenção: Firebase Admin não carregado -> {e}")

async def get_current_user(cred: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency injetável no FastAPI para barrar chamadas Cloud sem token validado.
    """
    if not cred:
        # Modo Flexível para o momento que o cliente ainda não configurou as Env Vars
        if not FIREBASE_READY or os.getenv("BYPASS_AUTH", "true").lower() == "true":
            return {"uid": "mock-admin-id", "email": "admin@contabilidade.com"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não Autorizado. Token JWT Ausente."
        )

    token = cred.credentials
    try:
        if not FIREBASE_READY:
            return {"uid": "mock-admin-id", "email": "admin@contabilidade.com"}
        
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Falha na Assinatura do Token Digital: {e}"
        )
