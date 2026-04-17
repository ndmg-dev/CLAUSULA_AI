import { WorkspaceLayout } from './layouts/WorkspaceLayout'
import { UniversalModal } from './components/ui/UniversalModal'
import { useState, useRef, useEffect } from 'react'
import { useAnalysisStore } from './store/useAnalysisStore'
import { DocumentEditor } from './components/document/DocumentEditor'
import { PdfViewer } from './components/document/PdfViewer'
import { FileText, Sheet, Loader2, PenTool, Lock, Edit3 } from 'lucide-react'
import axios from 'axios'
import { ClauseRewriteModal } from './components/ui/ClauseRewriteModal'
import { useAuthStore } from './store/useAuthStore'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from './lib/firebase'

function App() {
  const [demoModalOpen, setDemoModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { isAnalyzing, result, error, analyzeDocument, reset, setHoveredIssue, isEditMode, setEditMode } = useAnalysisStore()
  const { user, loading: authLoading, initializeAuthListener } = useAuthStore()

  const [rewriteOpen, setRewriteOpen] = useState(false)
  const [rewriteLoading, setRewriteLoading] = useState(false)
  const [rewriteResult, setRewriteResult] = useState<any>(null)
  const [rewriteError, setRewriteError] = useState<string | null>(null)

  // Auth local state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    initializeAuthListener()
  }, [initializeAuthListener])

  const handleRewrite = async (issueTitle: string, issueDesc: string, originalRef: string) => {
    setRewriteOpen(true)
    setRewriteLoading(true)
    setRewriteError(null)
    setRewriteResult(null)
    try {
      const res = await axios.post('http://localhost:8000/api/rewrite', {
        issue_title: issueTitle,
        issue_description: issueDesc,
        original_text: originalRef
      })
      setRewriteResult(res.data)
    } catch (e) {
      setRewriteError("Falha na formatação. O endpoint de reescrita deve estar indisponível.")
    } finally {
      setRewriteLoading(false)
    }
  }

  const handleExportZip = async () => {
    if (!result) return;
    setIsExporting(true);
    try {
      // Stream do ZIP gerado em Memória no Python
      const response = await axios.post('http://localhost:8000/api/export', result, {
        responseType: 'blob' 
      });
      // Cria a âncora virtual do JS para forçar o download local
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'laudos_clausula_ai.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDemoModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Falha ao exportar laudo.');
    } finally {
      setIsExporting(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      analyzeDocument(file)
    }
  }

  // Gatekeeper: Parede Paywall do SaaS (Firebase Auth)
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-workspace-50 text-brand-600 font-semibold"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }
  if (!user) {
    const handleGoogleLogin = async () => {
      setLoginError('');
      setIsLoggingIn(true);
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err: any) {
        setLoginError(`Acesso negado: ${err.message || err.code}`);
      } finally {
        setIsLoggingIn(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 text-center max-w-sm w-full mx-4">
           <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-brand-100">
             <Lock className="w-8 h-8" />
           </div>
           <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">Acessar Cláusula AI</h2>
           <p className="text-slate-500 mb-8 text-sm leading-relaxed">Plataforma exclusiva para equipes corporativas estruturadas.</p>
           
           <button 
              disabled={isLoggingIn} 
              onClick={handleGoogleLogin} 
              className="w-full relative flex items-center justify-center gap-3 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-lg font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
           >
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
              ) : (
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {isLoggingIn ? 'Autenticando...' : 'Continuar com o Google'}
           </button>
           
           {loginError && <p className="mt-5 text-red-500 text-xs text-left font-medium bg-red-50 p-3 rounded-lg border border-red-100">{loginError}</p>}
        </div>
      </div>
    )
  }

  // View 1: Sem Estado (Tela de Seleção de Arquivo e Prompt Inicial)
  if (!result && !isAnalyzing) {
    return (
      <WorkspaceLayout 
        headerContent={
          <div className="font-semibold text-workspace-900 tracking-tight">Nova Auditoria</div>
        }
        documentContent={
          <div className="w-full bg-white rounded-lg shadow-card border border-workspace-200 py-12 px-10 min-h-[70vh] flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-brand-100">
              <svg className="w-10 h-10 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-workspace-900 mb-2">Importar Contrato</h2>
            <p className="text-workspace-500 mb-8 max-w-sm leading-relaxed">
              Faça upload do documento societário ou contábil (PDF, DOCX) para iniciar a varredura com o Copilot IA.
            </p>
            
            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm w-full max-w-md text-left shadow-sm">
                <strong className="block mb-1">Falha na Inteligência:</strong> 
                <span className="opacity-90">{error}</span>
              </div>
            )}

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-card hover:shadow-floating transition-all font-medium border border-brand-700/50"
            >
              Procurar Arquivo Local
            </button>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept=".pdf,.docx,.jpg,.png"
              onChange={handleFileChange}
            />
          </div>
        }
        analysisContent={
          <div className="flex items-center justify-center min-h-[40vh] text-workspace-400 text-sm text-center px-6">
            Aguardando upload do documento para acionar a Inferência LangGraph.
          </div>
        }
      />
    )
  }

  // View 2: Spin/Loading (Integração Viva enquanto Workflow Engine Roda)
  if (isAnalyzing) {
    return (
      <WorkspaceLayout 
        headerContent={<div className="font-semibold text-workspace-900">Processando Inteligência Artificial...</div>}
        documentContent={
          <div className="w-full bg-white rounded-lg shadow-card border border-workspace-200 py-12 px-10 min-h-[70vh] flex flex-col items-center justify-center">
            <div className="w-14 h-14 border-[3px] border-workspace-200 border-t-brand-600 rounded-full animate-spin mb-6"></div>
            <h2 className="text-lg font-bold text-workspace-900 mb-2 tracking-tight">Lendo Documento</h2>
            <p className="text-workspace-500 text-sm">Convertendo OCR e validando cláusulas contra nosso LangGraph Engine...</p>
          </div>
        }
        analysisContent={
          <div className="animate-pulse space-y-6">
             <div className="h-4 bg-workspace-200 rounded w-2/3 mb-6"></div>
             <div className="h-24 bg-workspace-100 rounded-lg w-full border border-workspace-50"></div>
             <div className="h-24 bg-workspace-100 rounded-lg w-full border border-workspace-50"></div>
             <div className="h-24 bg-workspace-100 rounded-lg w-full border border-workspace-50"></div>
          </div>
        }
      />
    )
  }

  // View 3: A Mágica! A IA Terminou.
  return (
    <>
      <WorkspaceLayout 
        headerContent={
          <div className="flex items-center gap-4 text-sm z-50 relative">
            <span onClick={reset} className="cursor-pointer hover:text-brand-600 font-semibold text-workspace-500 transition-colors flex items-center gap-1">
              Refazer
            </span>
            <span className="text-workspace-300">/</span>
            <span className="font-semibold text-workspace-900 tracking-tight">Parecer Concluído</span>
          </div>
        }
        documentContent={
          <div className="w-full flex-1 flex flex-col pb-10">
            {/* Bloco 1: O Card Header / Score (Original e Premium) */}
            <div className="h-auto md:h-44 rounded-xl bg-gradient-to-r from-workspace-900 to-brand-900 p-8 flex flex-col md:flex-row items-start md:items-end justify-between shadow-floating mb-10 border border-brand-950 flex-shrink-0 gap-6">
               <div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
                    Score: {result?.document_health_score}/100
                    {result?.document_health_score === 100 && (
                      <span className="bg-health-good/20 text-health-good text-sm px-2 py-0.5 rounded border border-health-good/30">Impecável</span>
                    )}
                  </h2>
                  <p className="text-brand-200 font-medium text-sm lg:text-base">Nível de Risco Calculado: <span className="font-bold text-white">{result?.summary.risk_level}</span></p>
               </div>
               <button onClick={() => setDemoModalOpen(true)} className="px-5 py-2.5 bg-white/10 hover:bg-white text-white hover:text-brand-900 rounded-lg font-semibold text-sm shadow-sm transition-all border border-white/20 backdrop-blur-sm self-start md:self-auto">
                  Extrair
               </button>
            </div>
            
            {/* Bloco 2: O Parecer Executivo da IA */}
            <h3 className="text-xl font-bold text-workspace-900 mb-6 flex items-center gap-2 flex-shrink-0">
              <svg className="w-5 h-5 text-workspace-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Parecer Executivo
            </h3>
            <div className="bg-white p-6 rounded-lg border border-workspace-200 shadow-sm mb-12 flex-shrink-0 text-justify">
               {result?.summary.executive_summary.split('\n').map((paragraph, i) => {
                 if (!paragraph.trim()) return null;
                 return (
                   <p key={i} className="mb-4 text-workspace-700 leading-relaxed text-base">
                     {paragraph}
                   </p>
                 );
               })}
            </div>
            
            {/* Bloco 3: O Document Editor Rich Text ou PDFViewer */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
               <h3 className="text-xl font-bold text-workspace-900 flex items-center gap-2">
                 <svg className="w-5 h-5 text-workspace-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                 </svg>
                 {isEditMode ? 'Editor do Contrato' : 'Documento Original'}
               </h3>
               
               <button 
                  onClick={() => setEditMode(!isEditMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                    isEditMode 
                      ? 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100' 
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
               >
                 <Edit3 className="w-4 h-4" />
                 {isEditMode ? 'Visualizar Original PDF' : 'Resolver no Editor'}
               </button>
            </div>
            
            <div className="w-full relative overflow-hidden bg-transparent flex-1">
                {isEditMode ? <DocumentEditor /> : <PdfViewer />}
            </div>
          </div>
        }
        analysisContent={
          <>
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pt-2 pb-4 border-b border-workspace-100 z-10">
               <span className="font-bold text-workspace-900 text-sm tracking-tight flex items-center gap-2">
                 <span className="flex h-5 w-5 bg-brand-100 text-brand-700 items-center justify-center rounded-full text-xs">
                    {result?.issues.length}
                 </span>
                 Vulnerabilidades 
               </span>
            </div>

            <div className="space-y-5">
              {result?.issues.map((issue, idx) => {
                const isCritical = issue.severity === 'Critical';
                return (
                  <div 
                    key={idx} 
                    onMouseEnter={() => setHoveredIssue(idx)}
                    onMouseLeave={() => setHoveredIssue(null)}
                    className={`border p-5 rounded-xl shadow-sm transition-all hover:shadow-md cursor-crosshair relative overflow-hidden group ${
                    isCritical 
                      ? 'bg-red-50/50 border-red-200 hover:border-red-300' 
                      : 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                  }`}>
                    {/* Linha Lateral Dinâmica */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1 transition-all group-hover:w-1.5 ${isCritical ? 'bg-health-danger' : 'bg-health-warning'}`}></div>
                    
                    <div className="flex items-start gap-3 mb-2 ml-2">
                       <h3 className={`font-semibold text-sm tracking-tight ${isCritical ? 'text-red-900' : 'text-amber-900'}`}>
                         {issue.title}
                       </h3>
                    </div>
                    
                    <p className={`text-xs ml-2 leading-relaxed mb-4 ${isCritical ? 'text-red-800/90' : 'text-amber-800/90'}`}>
                      {issue.description}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-4 ml-2 max-w-full">
                      <div className={`inline-flex items-center px-2 py-1.5 rounded border shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] text-[10px] font-bold uppercase tracking-wider truncate flex-1 ${
                        isCritical ? 'bg-red-100 border-red-200 text-red-800' : 'bg-amber-100 border-amber-200 text-amber-800'
                      }`} title={issue.clause_reference}>
                         Original: {issue.clause_reference}
                      </div>

                      <button 
                        onClick={() => handleRewrite(issue.title, issue.description, issue.clause_reference)}
                        className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg shadow-sm transition-colors border ${
                        isCritical ? 'bg-red-600 hover:bg-red-700 text-white border-red-700' : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                      }`} title="Sugerir Redação">
                         <PenTool className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {result?.issues.length === 0 && (
                 <div className="p-6 bg-health-good/5 border border-health-good/20 rounded-xl text-center shadow-inner">
                    <p className="text-health-good font-bold text-sm tracking-tight">O Motor não detectou quebras de padrão nesse documento.</p>
                 </div>
              )}
            </div>
          </>
        }
      />

      <UniversalModal isOpen={demoModalOpen} onClose={() => setDemoModalOpen(false)} title="Exportar Laudo Auditável" footer={
          <>
            <button disabled={isExporting} onClick={() => setDemoModalOpen(false)} className="px-4 py-2 text-workspace-600 hover:text-workspace-900 hover:bg-workspace-100 rounded-md font-medium text-sm transition-all disabled:opacity-50">
              Cancelar
            </button>
            <button disabled={isExporting} onClick={handleExportZip} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md font-medium text-sm shadow transition-all border border-brand-700/50 disabled:opacity-50">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isExporting ? 'Processando Zip...' : 'Download do Zip'}
            </button>
          </>
      }>
         <div className="p-5 bg-workspace-50 border border-workspace-200 rounded-lg">
            <h4 className="text-xs font-bold text-workspace-500 uppercase tracking-widest mb-4">Pipeline de Compilação</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm text-workspace-800 font-medium bg-white p-3 rounded border border-workspace-100 shadow-sm">
                <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center border border-red-100">
                  <FileText className="w-4 h-4 text-red-600" />
                </div>
                <span>Resumo_Executivo.pdf</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-workspace-800 font-medium bg-white p-3 rounded border border-workspace-100 shadow-sm">
                <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center border border-green-100">
                  <Sheet className="w-4 h-4 text-green-600" />
                </div>
                <span>Matriz_de_Risco_Full.xlsx</span>
              </li>
            </ul>
         </div>
      </UniversalModal>

      <ClauseRewriteModal 
        isOpen={rewriteOpen}
        onClose={() => setRewriteOpen(false)}
        isLoading={rewriteLoading}
        rewrittenText={rewriteResult?.new_clause || null}
        explanation={rewriteResult?.explanation || null}
        error={rewriteError}
      />
    </>
  )
}

export default App
