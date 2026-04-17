import io
import logging
from pydantic import BaseModel
import fitz  # PyMuPDF
from unstructured.partition.auto import partition
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class DocumentContext(BaseModel):
    """
    Carrega o texto para o LLM juntamente com o mapa neural que liga cada parágrafo 
    à sua caixa contornada na folha, de modo agnóstico à resolução (BBoxes Normalizadas).
    """
    clean_text_for_llm: str
    paragraph_mapping: dict

async def parse_document_bytes(file_bytes: bytes, filename: str) -> DocumentContext:
    try:
        logger.info(f"Escaneando documento. Arquivo: {filename}")
        
        paragraphs = []
        mapping = {}
        idx = 0

        # Rota Ultrarrápida e Leve para PDF (PyMuPDF) -> Sem dependência de ML pesado
        if filename.lower().endswith('.pdf'):
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                w, h = page.rect.width, page.rect.height
                
                # Extraindo blocos de texto nativos
                blocks = page.get_text("blocks")
                for b in blocks:
                    # b = (x0, y0, x1, y1, "lines in block", block_no, block_type)
                    # block_type == 0 significa que é bloco de texto
                    if b[6] != 0:
                        continue
                        
                    text = b[4].strip()
                    if not text:
                        continue
                        
                    bbox_norm = {
                        "page_number": page_num + 1,
                        "x0": b[0] / w,
                        "y0": b[1] / h,
                        "x1": b[2] / w,
                        "y1": b[3] / h
                    }
                    
                    p_id = f"P{idx}"
                    paragraphs.append(f"[ID: {p_id}] {text}")
                    mapping[p_id] = bbox_norm
                    idx += 1
            doc.close()
            
        else:
            # Rota para DOCX, etc. usando unstructured puro (sem pacote extra PDF)
            file_obj = io.BytesIO(file_bytes)
            elements = partition(file=file_obj, metadata_filename=filename)
            
            for el in elements:
                text = str(el).strip()
                if not text:
                    continue
                    
                page = el.metadata.page_number if getattr(el.metadata, 'page_number', None) else 1
                bbox_norm = None
                
                if (hasattr(el.metadata, 'coordinates') and el.metadata.coordinates and 
                    hasattr(el.metadata.coordinates, 'system') and el.metadata.coordinates.system and 
                    hasattr(el.metadata.coordinates.system, 'width') and hasattr(el.metadata.coordinates.system, 'height')):
                    
                    w = el.metadata.coordinates.system.width
                    h = el.metadata.coordinates.system.height
                    pts = el.metadata.coordinates.points
                    
                    if w and h and pts:
                        xs = [p[0] for p in pts]
                        ys = [p[1] for p in pts]
                        bbox_norm = {
                            "page_number": page,
                            "x0": min(xs) / w,
                            "y0": min(ys) / h,
                            "x1": max(xs) / w,
                            "y1": max(ys) / h
                        }
                        
                p_id = f"P{idx}"
                paragraphs.append(f"[ID: {p_id}] {text}")
                mapping[p_id] = bbox_norm
                idx += 1

        extracted_text = "\n\n".join(paragraphs)
        if not extracted_text:
            raise ValueError("Documento vazio ou corrompido.")
            
        logger.info(f"Parsing concluído. {len(mapping)} blocos mapeados.")
        return DocumentContext(clean_text_for_llm=extracted_text, paragraph_mapping=mapping)

    except Exception as e:
        logger.error(f"Erro no Parser: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail=f"Falha ao ler o documento: {str(e)}"
        )
