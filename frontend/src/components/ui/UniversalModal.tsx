import React, { useEffect, useState } from 'react';

export interface UniversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Restringe as larguras para manter uma hierarquia visual limpa */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/**
 * UniversalModal
 * O Modal definitivo da aplicação. Todo e qualquer popup/modal DEVE usar esse componente
 * para garantir a homogeneidade de shadows, blur overlay e animações "Pixel Perfect".
 */
export const UniversalModal: React.FC<UniversalModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md'
}) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Minúsculo delay para forçar as transições CSS iniciarem após o mount no DOM
      requestAnimationFrame(() => setIsVisible(true));
      document.body.style.overflow = 'hidden'; // Evita "double-scroll" no corpo da página
    } else {
      setIsVisible(false);
      // Sincroniza desmontagem com a duração da transição (300ms)
      const timer = setTimeout(() => setIsRendered(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Overlay - Unificando a sensação de foco */}
      <div 
        className={`fixed inset-0 bg-transparent transition-all duration-300 ease-in-out
          ${isVisible ? 'bg-workspace-900/40 backdrop-blur-[2px]' : 'bg-workspace-900/0 backdrop-blur-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div 
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white rounded-xl shadow-modal flex flex-col
          transition-all duration-300 ease-out transform
          ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header - Espaçamento e tipografia consistentes */}
        <div className="px-6 py-5 border-b border-workspace-100 flex items-center justify-between">
          <h3 id="modal-title" className="text-lg font-semibold text-workspace-900 tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-workspace-400 hover:text-workspace-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 rounded-md transition-colors p-1"
            aria-label="Encerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - Área limpa de rolagem com scrollbar customizada refinada */}
        <div className="px-6 py-6 text-workspace-700 text-sm leading-relaxed overflow-y-auto max-h-[70vh] scrollbar-premium">
          {children}
        </div>

        {/* Optional Footer (Ex: Botões de ação, Export, Cancel) */}
        {footer && (
          <div className="px-6 py-4 border-t border-workspace-100 bg-workspace-50 rounded-b-xl flex justify-end gap-3 transition-colors">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
