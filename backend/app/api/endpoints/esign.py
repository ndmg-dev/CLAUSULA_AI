from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
import httpx
import os

router = APIRouter()

ZAPSIGN_API_URL = "https://api.zapsign.com.br/api/v1/docs/"

class SignerRequest(BaseModel):
    name: str = Field(description="Nome completo do signatário")
    email: str = Field(description="E-mail do signatário")
    role: str = Field(default="Contratante", description="Papel do signatário")

class EsignRequest(BaseModel):
    document_name: str = Field(default="Contrato - Cláusula AI", description="Nome do documento")
    file_base64: str = Field(description="Conteúdo do documento em Base64 (docx)")
    signers: List[SignerRequest] = Field(description="Lista de signatários")

class SignerResponse(BaseModel):
    name: str
    email: str
    sign_url: Optional[str] = None
    status: str = "pending"

class EsignResponse(BaseModel):
    success: bool
    message: str
    document_token: Optional[str] = None
    signers: List[SignerResponse] = []

@router.post("/send", response_model=EsignResponse)
async def send_to_sign(request: EsignRequest):
    """
    Envia um documento para assinatura eletrônica via ZapSign.
    Cria o documento na plataforma e dispara e-mails automáticos para os signatários.
    """
    api_token = os.getenv("ZAPSIGN_API_TOKEN")
    
    if not api_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token da API ZapSign não configurado. Adicione ZAPSIGN_API_TOKEN ao .env"
        )

    # Monta o payload conforme a documentação oficial da ZapSign
    zapsign_payload = {
        "name": request.document_name,
        "base64_docx": request.file_base64,
        "signers": [
            {
                "name": signer.name,
                "email": signer.email,
                "auth_mode": "assinaturaTela",
                "send_automatic_email": True,
                "send_automatic_whatsapp": False,
            }
            for signer in request.signers
        ],
        "lang": "pt-br",
        "disable_signer_emails": False,
        "sandbox": True,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                ZAPSIGN_API_URL,
                json=zapsign_payload,
                headers={
                    "Authorization": f"Bearer {api_token}",
                    "Content-Type": "application/json"
                }
            )
        
        if response.status_code in (200, 201):
            data = response.json()
            
            # Extrai info dos signatários retornados pela ZapSign
            signer_responses = []
            for s in data.get("signers", []):
                signer_responses.append(SignerResponse(
                    name=s.get("name", ""),
                    email=s.get("email", ""),
                    sign_url=s.get("sign_url", ""),
                    status=s.get("status", "pending")
                ))
            
            return EsignResponse(
                success=True,
                message="Documento enviado para assinatura com sucesso via ZapSign!",
                document_token=data.get("token", ""),
                signers=signer_responses
            )
        else:
            error_detail = response.text
            print(f"[E-Sign] ZapSign retornou {response.status_code}: {error_detail}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"ZapSign rejeitou a requisição ({response.status_code}): {error_detail}"
            )
    
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Timeout ao conectar com a ZapSign. Tente novamente."
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno na integração com ZapSign: {str(e)}"
        )
