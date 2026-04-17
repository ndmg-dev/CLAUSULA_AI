import React from 'react';
import { UniversalModal } from './UniversalModal';
import { Copy, Check, Loader2 } from 'lucide-react';

import { useAnalysisStore } from '../../store/useAnalysisStore';

interface ClauseRewriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  rewrittenText: string | null;
  explanation: string | null;
  error: string | null;
}

export const ClauseRewriteModal: React.FC<ClauseRewriteModalProps> = ({
  isOpen, onClose, isLoading, rewrittenText, explanation, error
}) => {
  const [copied, setCopied] = React.useState(false);
  const [applied, setApplied] = React.useState(false);
  const { insertTextToEditor, setEditMode } = useAnalysisStore();

  const handleCopy = () => {
    if (rewrittenText) {
      navigator.clipboard.writeText(rewrittenText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (rewrittenText && insertTextToEditor) {
      setEditMode(true);
      insertTextToEditor(rewrittenText);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    }
  };

  return (
    <UniversalModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Proposta de Redação Segura (DREI)"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-workspace-600 hover:text-workspace-900 transition-colors text-sm font-medium">
            Fechar
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCopy} 
              disabled={isLoading || !rewrittenText}
              className="flex items-center gap-2 px-4 py-2 bg-white text-workspace-700 border border-workspace-200 hover:bg-workspace-50 rounded-lg font-medium text-sm shadow-sm transition-all disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button 
              onClick={handleApply} 
              disabled={isLoading || !rewrittenText || !insertTextToEditor}
              className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm shadow transition-all disabled:opacity-50"
            >
              {applied ? <Check className="w-4 h-4" /> : null}
              {applied ? 'Aplicado' : 'Aplicar ao Documento'}
            </button>
          </div>
        </>
      }
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8 bg-workspace-50 rounded-lg border border-workspace-100">
           <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-4" />
           <p className="text-workspace-600 text-sm font-medium">A Inteligência está redigindo a correção B2B...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
           {error}
        </div>
      ) : rewrittenText ? (
        <div className="space-y-4">
          <div className="bg-white border border-brand-200 p-4 rounded-lg shadow-sm">
             <h4 className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mb-2">Nova Cláusula Sugerida</h4>
             <p className="text-workspace-800 text-sm leading-relaxed">{rewrittenText}</p>
          </div>
          {explanation && (
            <div className="bg-workspace-50 p-4 rounded-lg border border-workspace-200">
               <h4 className="text-[10px] font-bold text-workspace-500 uppercase tracking-widest mb-2">Fundamentação Contábil</h4>
               <p className="text-workspace-600 text-xs leading-relaxed">{explanation}</p>
            </div>
          )}
        </div>
      ) : null}
    </UniversalModal>
  );
};
