import { useState } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle2, FileSearch, 
  Loader2, ChevronDown, ChevronRight, Sparkles, 
  ClipboardCheck, Building2, Receipt, Scale,
  Library, Activity, CloudUpload, MessageSquare, PenTool
} from 'lucide-react';
import { useAuditStore, MOCK_RESULT, type AuditIssue } from '../store/useAuditStore';
import { getContractText, applySuggestion, highlightClause, focusClause, insertCommentToClause, getWordDocumentAsBase64, replaceClauseIntelligently, insertNewClauseAtPosition } from '../services/wordInterface';
import axios from 'axios';
import { TemplatesTab } from './TemplatesTab';
import { EsignTab } from './EsignTab';
import { CopilotChat } from './CopilotChat';

// ================================================================
// MAPA DE CATEGORIAS -> ÍCONE + LABEL CONTÁBIL
// ================================================================
const CATEGORY_MAP: Record<string, { icon: typeof Shield; label: string; color: string }> = {
  DREI:      { icon: Building2,     label: 'Exigência da Junta',       color: 'text-red-600' },
  CNAE:      { icon: Receipt,       label: 'Enquadramento Tributário', color: 'text-amber-600' },
  Capital:   { icon: Scale,         label: 'Estrutura de Capital',     color: 'text-orange-600' },
  Governança:{ icon: ClipboardCheck,label: 'Governança Societária',    color: 'text-blue-600' },
};

// ================================================================
// SUB-COMPONENTE: Card de Vulnerabilidade Individual
// ================================================================
function IssueCard({ issue }: { issue: AuditIssue }) {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [highlighting, setHighlighting] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [commented, setCommented] = useState(false);
  
  const cat = CATEGORY_MAP[issue.category] || CATEGORY_MAP.DREI;
  const CatIcon = cat.icon;
  const isCritical = issue.severity === 'Critical';

  const handleApply = async () => {
    if (!issue.suggested_fix) return;
    setApplying(true);
    try {
      let success = false;
      
      if (issue.is_omission) {
        // OMISSÃO: Insere cláusula nova na posição correta do contrato
        success = await insertNewClauseAtPosition(
          issue.title,
          issue.suggested_fix
        );
      } else {
        // CORREÇÃO: Substitui o trecho problemático no local exato
        success = await replaceClauseIntelligently(
          issue.clause_reference,
          issue.suggested_fix
        );
      }
      
      if (!success) {
        // Último fallback: insere no cursor
        await applySuggestion(issue.suggested_fix);
      }
      
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    } catch (e) {
      console.error('[Taskpane] Falha ao aplicar sugestão:', e);
    } finally {
      setApplying(false);
    }
  };

  const handleLocate = async () => {
    if (issue.is_omission) return;
    setHighlighting(true);
    try {
      // Busca o texto da clause_reference no documento para navegar
      await highlightClause(issue.clause_reference);
    } catch (e) {
      console.error('[Taskpane] Falha ao localizar cláusula:', e);
    } finally {
      setHighlighting(false);
    }
  };

  const handleMouseEnter = () => {
    if (!issue.is_omission) {
      focusClause(issue.clause_reference);
    }
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      className={`border rounded-lg overflow-hidden transition-all duration-200 animate-slide-up ${
        isCritical 
          ? 'border-red-200 bg-red-50/50' 
          : 'border-amber-200 bg-amber-50/50'
      }`}
      style={{ animationDelay: `${parseInt(issue.id.split('_')[1] || '0') * 80}ms` }}
    >
      {/* Barra lateral de severidade */}
      <div className="flex">
        <div className={`w-1 flex-shrink-0 ${isCritical ? 'bg-red-500' : 'bg-amber-400'}`} />
        
        <div className="flex-1 p-3">
          {/* Header do Card */}
          <button 
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-start gap-2 text-left group"
          >
            <CatIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cat.color}`} />
            <div className="flex-1 min-w-0">
              <h3 className={`text-xs font-semibold leading-tight ${
                isCritical ? 'text-red-900' : 'text-amber-900'
              }`}>
                {issue.title}
              </h3>
              <span className={`inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-2xs font-bold uppercase tracking-wider ${
                isCritical 
                  ? 'bg-red-100 text-red-700 border border-red-200' 
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}>
                {cat.label}
              </span>
            </div>
            {expanded 
              ? <ChevronDown className="w-3.5 h-3.5 text-workspace-400 mt-0.5 flex-shrink-0" /> 
              : <ChevronRight className="w-3.5 h-3.5 text-workspace-400 mt-0.5 flex-shrink-0" />
            }
          </button>

          {/* Corpo Expandido */}
          {expanded && (
            <div className="mt-3 space-y-3">
              <p className={`text-xs leading-relaxed ${isCritical ? 'text-red-800/90' : 'text-amber-800/90'}`}>
                {issue.description}
              </p>

              {/* Referência Original e Comentário */}
              {!issue.is_omission && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLocate}
                    disabled={highlighting}
                    className={`flex-1 text-left px-2.5 py-2 rounded border text-2xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors ${
                      isCritical 
                        ? 'bg-red-100 border-red-200 text-red-800 hover:bg-red-150' 
                        : 'bg-amber-100 border-amber-200 text-amber-800 hover:bg-amber-150'
                    }`}
                  >
                    {highlighting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSearch className="w-3 h-3" />}
                    Localizar: {issue.clause_reference}
                  </button>

                  <button
                    onClick={async () => {
                      setCommenting(true);
                      const msg = `[Cláusula AI] Risco ${isCritical ? 'CRÍTICO' : 'MÉDIO'} detectado: ${issue.title}. Recomendação: ${issue.suggested_fix || 'Revisar escopo DREI.'}`;
                      const success = await insertCommentToClause(issue.clause_reference, msg);
                      if (success) {
                        setCommented(true);
                        setTimeout(() => setCommented(false), 3000);
                      }
                      setCommenting(false);
                    }}
                    disabled={commenting || commented}
                    title="Inserir como Comentário no Word"
                    className={`px-3 py-2 rounded border text-2xs font-semibold uppercase tracking-wider flex items-center justify-center transition-colors ${
                      commented
                        ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {commenting ? <Loader2 className="w-3 h-3 animate-spin" /> : commented ? <CheckCircle2 className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                  </button>
                </div>
              )}

              {issue.is_omission && (
                <div className="px-2.5 py-2 rounded border border-slate-200 bg-slate-50 text-2xs font-medium text-slate-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-slate-400" />
                  Cláusula ausente — Será inserida após a última cláusula do contrato
                </div>
              )}

              {/* Sugestão da IA */}
              {issue.suggested_fix && (
                <div className="bg-white rounded border border-brand-100 overflow-hidden">
                  <div className="px-2.5 py-1.5 bg-brand-50 border-b border-brand-100 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-brand-600" />
                    <span className="text-2xs font-semibold text-brand-700 uppercase tracking-wider">Sugestão IA</span>
                  </div>
                  <p className="px-2.5 py-2 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {issue.suggested_fix}
                  </p>
                  <div className="px-2.5 py-2 border-t border-slate-100">
                    <button
                      onClick={handleApply}
                      disabled={applying || applied}
                      className={`w-full py-2 rounded text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                        applied
                          ? 'bg-health-good text-white'
                          : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'
                      } disabled:opacity-60`}
                    >
                      {applying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {applied && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {applying ? 'Corrigindo...' : applied ? 'Cláusula Substituída!' : issue.is_omission ? 'Inserir Cláusula no Contrato' : 'Corrigir Automaticamente'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// COMPONENTE PRINCIPAL: TASKPANE
// ================================================================
export function Taskpane() {
  const [activeTab, setActiveTab] = useState<'auditor' | 'templates' | 'esign' | 'chat'>('auditor');
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudSaved, setCloudSaved] = useState(false);
  const { isAuditing, result, error, setAuditing, setResult, setError, reset } = useAuditStore();

  const handleAudit = async () => {
    setAuditing(true);
    try {
      // Fase 1: Lê o texto do Word
      const text = await getContractText();
      
      if (!text || text.trim().length < 50) {
        setError('Documento vazio ou insuficiente para análise. Abra um contrato societário.');
        return;
      }

      // Fase 2: Envia ao Backend FastAPI real via Proxy do Vite
      const response = await axios.post('/api/analyze/text', { text });
      setResult(response.data);
      
    } catch (e: any) {
      console.error('[Taskpane] Erro na auditoria:', e);
      setError(e?.message || 'Falha ao conectar com o motor de inteligência.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-office-surface">
      
      {/* ==================== HEADER ==================== */}
      <header className="bg-white border-b border-workspace-200 px-4 py-3 flex-shrink-0 flex justify-between items-center z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-brand-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            C.
          </div>
          <div>
            <h1 className="text-sm font-bold text-workspace-900 leading-tight tracking-tight">
              Cláusula AI
            </h1>
            <p className="text-2xs text-workspace-500 font-medium">
              Auditoria Societária • DREI
            </p>
          </div>
        </div>

        {/* CLOUD SYNC BUTTON — Salva o documento no OneDrive/SharePoint */}
        <button
          onClick={async () => {
            setCloudSaving(true);
            try {
              await new Promise<void>((resolve, reject) => {
                (Office.context.document as any).saveAsync((result: any) => {
                  if (result.status === Office.AsyncResultStatus.Succeeded) {
                    resolve();
                  } else {
                    reject(new Error(result.error?.message || 'Falha ao salvar'));
                  }
                });
              });
              setCloudSaved(true);
              setTimeout(() => setCloudSaved(false), 3000);
            } catch (e: any) {
              console.error('[CloudSync] Erro:', e);
              alert('Salve o documento no OneDrive primeiro (Arquivo > Salvar Como > OneDrive) para ativar a sincronização na nuvem.');
            } finally {
              setCloudSaving(false);
            }
          }}
          disabled={cloudSaving || cloudSaved}
          title="Salvar e sincronizar com OneDrive"
          className={`p-1.5 rounded-md transition-colors border ${
            cloudSaved 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-brand-600 shadow-sm'
          }`}
        >
          {cloudSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : cloudSaved ? <CheckCircle2 className="w-4 h-4" /> : <CloudUpload className="w-4 h-4" />}
        </button>
      </header>

      {/* ==================== CONTEÚDO DA ABA ==================== */}
      {activeTab === 'auditor' ? (
        <main className="flex-1 overflow-y-auto scrollbar-slim pb-20">
        
        {/* ---- ESTADO INICIAL: Sem análise ---- */}
        {!result && !isAuditing && (
          <div className="p-4 space-y-4">
            {/* CTA Principal */}
            <div className="bg-white rounded-lg border border-workspace-200 p-5 text-center shadow-card">
              <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-brand-100">
                <Shield className="w-6 h-6 text-brand-600" />
              </div>
              <h2 className="text-sm font-bold text-workspace-900 mb-1">Auditar Contrato Atual</h2>
              <p className="text-xs text-workspace-500 leading-relaxed mb-4">
                Analisa o documento aberto no Word contra as regras do DREI, enquadramento CNAE e exigências da Junta Comercial.
              </p>
              <button
                onClick={handleAudit}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <FileSearch className="w-4 h-4" />
                Iniciar Varredura
              </button>
            </div>

            {/* Erro */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <strong className="block mb-1">Falha na Análise:</strong>
                {error}
              </div>
            )}

            {/* Info contextual */}
            <div className="bg-brand-50/50 border border-brand-100 rounded-lg p-3">
              <p className="text-2xs text-brand-800 font-medium leading-relaxed">
                <strong>Escopo da Auditoria:</strong> Contratos Sociais, Alterações Contratuais e Atas de Sociedades Limitadas. 
                O motor analisa compliance com IN DREI 81/2020 e exigências para registro na Junta Comercial.
              </p>
            </div>
          </div>
        )}

        {/* ---- ESTADO: Processando ---- */}
        {isAuditing && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[300px] text-center">
            <div className="w-10 h-10 border-[3px] border-workspace-200 border-t-brand-600 rounded-full animate-spin mb-4" />
            <h3 className="text-sm font-bold text-workspace-900 mb-1">Analisando Contrato</h3>
            <p className="text-xs text-workspace-500">
              Validando cláusulas contra base normativa DREI...
            </p>
          </div>
        )}

        {/* ---- ESTADO: Resultado ---- */}
        {result && (
          <div className="space-y-0">
            {/* Score Card */}
            <div className="bg-gradient-to-br from-workspace-900 to-brand-900 p-4 text-white">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-2xs text-brand-200 font-semibold uppercase tracking-wider mb-1">Score do Documento</p>
                  <p className="text-3xl font-bold tracking-tight leading-none">
                    {result.document_health_score}<span className="text-lg text-brand-300 font-medium">/100</span>
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-2xs font-bold uppercase tracking-wider ${
                  result.document_health_score >= 80 ? 'bg-health-good/20 text-emerald-300' :
                  result.document_health_score >= 50 ? 'bg-health-warning/20 text-amber-300' :
                  'bg-health-danger/20 text-red-300'
                }`}>
                  Risco {result.summary.risk_level}
                </div>
              </div>
              <p className="text-xs text-brand-200 leading-relaxed whitespace-pre-wrap">
                {result.summary.executive_summary}
              </p>
            </div>

            {/* Header de Seção */}
            <div className="px-4 py-3 bg-white border-b border-workspace-200 flex items-center justify-between sticky top-0 z-10">
              <span className="text-xs font-bold text-workspace-900 flex items-center gap-2">
                <span className="flex h-5 w-5 bg-health-danger/10 text-health-danger items-center justify-center rounded-full text-2xs font-bold">
                  {result.issues.length}
                </span>
                Pontos de Atenção
              </span>
              <button 
                onClick={reset}
                className="text-2xs text-workspace-500 hover:text-brand-600 font-medium transition-colors"
              >
                Nova análise
              </button>
            </div>

            {/* Lista de Issues */}
            <div className="p-3 space-y-3">
              {result.issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}

              {result.issues.length === 0 && (
                <div className="p-4 bg-health-good/5 border border-health-good/20 rounded-lg text-center">
                  <CheckCircle2 className="w-6 h-6 text-health-good mx-auto mb-2" />
                  <p className="text-xs font-semibold text-health-good">
                    Nenhuma exigência identificada. Documento apto para registro.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      ) : activeTab === 'templates' ? (
        <main className="flex-1 overflow-y-auto scrollbar-slim pb-20">
          <TemplatesTab />
        </main>
      ) : activeTab === 'chat' ? (
        <main className="flex-1 overflow-y-auto scrollbar-slim pb-20">
          <CopilotChat />
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto scrollbar-slim pb-20">
          <EsignTab />
        </main>
      )}

      {/* ==================== BOTTOM NAVBAR ==================== */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-workspace-200 flex items-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
        <button 
          onClick={() => setActiveTab('auditor')}
          className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'auditor' ? 'text-brand-600' : 'text-workspace-400 hover:text-workspace-600'}`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Auditoria</span>
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'templates' ? 'text-brand-600' : 'text-workspace-400 hover:text-workspace-600'}`}
        >
          <Library className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Modelos</span>
        </button>
        <button 
          onClick={() => setActiveTab('esign')}
          className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'esign' ? 'text-indigo-600' : 'text-workspace-400 hover:text-workspace-600'}`}
        >
          <PenTool className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">E-Sign</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'chat' ? 'text-teal-600' : 'text-workspace-400 hover:text-workspace-600'}`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Copiloto</span>
        </button>
      </footer>
    </div>
  );
}
