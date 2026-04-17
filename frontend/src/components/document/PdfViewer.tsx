import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useAnalysisStore } from '../../store/useAnalysisStore';

// Injeção limpa de Web Worker para evitar gargalo na thread principal do React
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * Validação determinística de BBox:
 * Retorna true SOMENTE se todas as coordenadas são números finitos entre 0 e 1
 * e formam uma caixa com área positiva.
 */
function isValidBbox(bbox: any): boolean {
  if (!bbox || typeof bbox !== 'object') return false;
  const { x0, y0, x1, y1, page_number } = bbox;
  if (typeof x0 !== 'number' || typeof y0 !== 'number' ||
      typeof x1 !== 'number' || typeof y1 !== 'number' ||
      typeof page_number !== 'number') return false;
  if (!isFinite(x0) || !isFinite(y0) || !isFinite(x1) || !isFinite(y1)) return false;
  // Coordenadas devem estar no range normalizado e formar uma caixa real
  if (x0 < 0 || y0 < 0 || x1 > 1.05 || y1 > 1.05) return false;
  if ((x1 - x0) < 0.01 || (y1 - y0) < 0.005) return false;  // caixa mínima viável
  return page_number >= 1;
}

export const PdfViewer: React.FC = () => {
  const { selectedFile, result, hoveredIssueIndex } = useAnalysisStore();
  const [numPages, setNumPages] = useState<number>();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Bufferiza o Documento para Objeto Nativo do Browser assim não recarregamos da rede
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [selectedFile]);

  // ========== AUTO-SCROLL PREMIUM ==========
  // Quando o card da sidebar é hovered, scrolla suavemente até o highlight correspondente
  useEffect(() => {
    if (hoveredIssueIndex === null || hoveredIssueIndex === undefined) return;
    
    // Timeout mínimo para dar tempo ao React renderizar o estado hovered no DOM
    const timer = setTimeout(() => {
      const el = document.getElementById(`hlt-box-${hoveredIssueIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [hoveredIssueIndex]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Precalcula as highlights indexando pela página para otimizar Render Cycle (O(N) vs O(N*P))
  // NULL CHECK RIGOROSO: só inclui issues com bounding_box válido e coordenadas reais
  const pageHighlights = useMemo(() => {
    const map = new Map<number, Array<{ id: number, bbox: any, severity: string, hovered: boolean }>>();
    if (!result) return map;

    result.issues.forEach((issue, idx) => {
      // Gate 1: bounding_box deve existir e não ser null
      if (!issue.bounding_box) return;
      // Gate 2: coordenadas devem ser válidas (anti-alucinação)
      if (!isValidBbox(issue.bounding_box)) return;
      
      const page = issue.bounding_box.page_number;
      if (!map.has(page)) map.set(page, []);
      map.get(page)!.push({
        id: idx,
        bbox: issue.bounding_box,
        severity: issue.severity,
        hovered: hoveredIssueIndex === idx
      });
    });
    return map;
  }, [result, hoveredIssueIndex]);

  if (!fileUrl) return null;

  return (
    <div ref={containerRef} className="flex justify-center bg-workspace-100 py-8 overflow-x-auto w-full rounded-lg">
      <div className="bg-transparent text-left relative max-w-[900px] w-full">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex flex-col items-center gap-8 w-full"
          loading={
            <div className="flex animate-pulse flex-col items-center gap-2 text-workspace-400">
               <div className="h-6 w-6 border-2 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
               <span className="text-sm font-medium">Inicializando WebGL Viewer...</span>
            </div>
          }
        >
          {Array.from(new Array(numPages || 0), (el, index) => {
            const pageNum = index + 1;
            const highlights = pageHighlights.get(pageNum) || [];

            return (
              <div key={`page_${pageNum}`} className="relative shadow-card bg-white rounded-md overflow-hidden">
                <Page 
                  pageNumber={pageNum} 
                  renderTextLayer={true} 
                  renderAnnotationLayer={true} 
                  className="max-w-full"
                  width={800}
                />
                
                {/* Motor de Highlight Geométrico (apenas issues com bbox real) */}
                {highlights.map((hlt) => (
                  <div
                    key={`hlt_${hlt.id}`}
                    id={`hlt-box-${hlt.id}`}
                    className={`absolute rounded transition-all duration-300 mix-blend-multiply pointer-events-none ${
                       hlt.severity === 'Critical' 
                         ? 'bg-health-danger/20 border border-health-danger/40' 
                         : 'bg-health-warning/20 border border-health-warning/40'
                    } ${hlt.hovered ? 'ring-2 ring-brand-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10 scale-[1.02] bg-brand-200/40' : 'z-0'}`}
                    style={{
                      left: `${hlt.bbox.x0 * 100}%`,
                      top: `${hlt.bbox.y0 * 100}%`,
                      width: `${(hlt.bbox.x1 - hlt.bbox.x0) * 100}%`,
                      height: `${(hlt.bbox.y1 - hlt.bbox.y0) * 100}%`
                    }}
                  />
                ))}
              </div>
            );
          })}
        </Document>
      </div>
    </div>
  );
};

