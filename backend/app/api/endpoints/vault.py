from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
import base64
import uuid
import datetime
import os
from app.core.security import get_current_user, FIREBASE_READY

router = APIRouter()

class VaultUploadRequest(BaseModel):
    file_base64: str = Field(description="O conteúdo do documento encodado em base64")
    filename: str = Field(default="documento.docx", description="O nome do arquivo alvo")

class VaultUploadResponse(BaseModel):
    success: bool
    message: str
    file_url: Optional[str] = None
    file_path: Optional[str] = None

def _try_firebase_upload(file_bytes: bytes, cloud_path: str) -> Optional[str]:
    """Tenta upload no Firebase Storage. Retorna signed_url ou None."""
    try:
        from firebase_admin import storage
        bucket = storage.bucket()
        blob = bucket.blob(cloud_path)
        
        blob.upload_from_string(
            file_bytes, 
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.timedelta(days=7),
            method="GET"
        )
        return signed_url
    except Exception as e:
        print(f"[Vault] Firebase Storage indisponível: {e}")
        return None

def _save_locally(file_bytes: bytes, cloud_path: str) -> str:
    """Fallback: salva o arquivo localmente no servidor."""
    vault_dir = os.path.join(os.getcwd(), "vault_local")
    os.makedirs(vault_dir, exist_ok=True)
    
    local_path = os.path.join(vault_dir, os.path.basename(cloud_path))
    with open(local_path, "wb") as f:
        f.write(file_bytes)
    
    return local_path

@router.post("/upload", response_model=VaultUploadResponse)
async def upload_to_vault(request: VaultUploadRequest, user: dict = Depends(get_current_user)):
    """
    Recebe um payload Binário (Base64) do Add-in do Word e arquiva permanentemente.
    Tenta Firebase Storage primeiro; se indisponível, salva localmente como fallback.
    """
    try:
        file_bytes = base64.b64decode(request.file_base64)
        
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = f"{unique_id}_{request.filename}"
        cloud_path = f"clausula_vault/{user.get('uid', 'anonymous')}/{safe_filename}"
        
        # Tentativa 1: Firebase Cloud Storage
        if FIREBASE_READY:
            signed_url = _try_firebase_upload(file_bytes, cloud_path)
            if signed_url:
                return VaultUploadResponse(
                    success=True,
                    message="Documento salvo no Cofre Cloud (Firebase Storage)",
                    file_url=signed_url,
                    file_path=cloud_path
                )
        
        # Fallback: Salvamento local no servidor
        local_path = _save_locally(file_bytes, cloud_path)
        return VaultUploadResponse(
            success=True,
            message="Documento salvo no Cofre Local do servidor (Firebase Storage não configurado)",
            file_url=f"/vault_local/{os.path.basename(local_path)}",
            file_path=local_path
        )
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha de I/O no cofre: {str(e)}"
        )
