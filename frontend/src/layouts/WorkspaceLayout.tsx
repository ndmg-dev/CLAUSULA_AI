import React from 'react';
import { UserAvatarMenu } from '../components/ui/UserAvatarMenu';

interface WorkspaceLayoutProps {
  sidebarContent?: React.ReactNode;
  headerContent?: React.ReactNode;
  documentContent: React.ReactNode;
  analysisContent: React.ReactNode;
}

/**
 * WorkspaceLayout
 * O layout arquitetural do aplicativo principal de análise jurídica/contábil.
 * Divide a tela matematicamente para a visualização do Documento e da Inteligência de Negócios (Alerts/Insights).
 */
export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  sidebarContent,
  headerContent,
  documentContent,
  analysisContent
}) => {
  return (
    <div className="flex h-screen w-full bg-workspace-50 overflow-hidden font-sans">
      
      {/* 
        Sidebar Minimalista (Esquerda) 
        Ideal para navegação, histórico recente de contratos e acesso a configurações. 
      */}
      <aside className="w-16 lg:w-[260px] flex-shrink-0 bg-white border-r border-workspace-200 hidden md:flex flex-col z-10 transition-all duration-300 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.02)]">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-workspace-100 bg-white">
          <div className="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center text-white font-bold tracking-tighter">
            C.
          </div>
          <span className="ml-3 hidden lg:block font-semibold text-workspace-900 tracking-tight">
            Cláusula AI
          </span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide py-4 px-3">
          {sidebarContent}
        </div>
      </aside>

      {/* Main Workspace Area (Direita / Centro) */}
      <div className="flex flex-col flex-1 min-w-0 bg-workspace-50">
        
        {/* Top Header - Navegação e Ferramentas Globais */}
        <header className="h-16 bg-white border-b border-workspace-200 shadow-sm flex items-center px-6 justify-between z-10">
          <div className="flex-1 flex items-center">
            <h1 className="text-sm font-medium text-workspace-800 tracking-tight">
              {headerContent || "Workspace"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <UserAvatarMenu />
          </div>
        </header>

        {/* 
          Conteúdo Duplo: Documento vs Painel de IA
          Distrações zero. O centro focal é a leitura limpa do contrato contábil/jurídico.
        */}
        <main className="flex-1 flex overflow-hidden relative">
          
          {/* Main Document Viewer (Centro/Expansivo) */}
          <section className="flex-1 relative overflow-y-auto scrollbar-premium flex justify-center py-8 px-6 lg:px-12 transition-all">
            <div className="w-full max-w-5xl flex flex-col mb-8">
              {/* O conteúdo empilhado provido pela App vai morar nativamente aqui */}
              {documentContent}
            </div>
          </section>

          {/* Painel Smart Review / Health Score (Direita) */}
          <aside className="w-80 lg:w-[400px] flex-shrink-0 bg-white border-l border-workspace-200 flex flex-col shadow-[inset_1px_0_0_0_rgba(255,255,255,1)] z-10 relative">
            <div className="h-14 border-b border-workspace-100 flex items-center px-6 bg-workspace-50/50 backdrop-blur-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-workspace-500">
                Insights & Análise
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-premium p-6 space-y-6">
              {analysisContent}
            </div>
          </aside>

        </main>
      </div>
    </div>
  );
};
