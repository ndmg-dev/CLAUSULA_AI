import { useState } from 'react';
import { PenTool, Send, CheckCircle2, Loader2, Link, UserPlus, Mail, ShieldAlert, ExternalLink } from 'lucide-react';
import { getWordDocumentAsBase64 } from '../services/wordInterface';
import axios from 'axios';

interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SignerResult {
  name: string;
  email: string;
  sign_url: string;
  status: string;
}

export function EsignTab() {
  const [signers, setSigners] = useState<Signer[]>([
    { id: '1', name: '', email: '', role: 'Contratante' }
  ]);
  const [sending, setSending] = useState(false);
  const [signerResults, setSignerResults] = useState<SignerResult[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addSigner = () => {
    setSigners([...signers, { id: Date.now().toString(), name: '', email: '', role: 'Contratada' }]);
  };

  const updateSigner = (id: string, field: keyof Signer, value: string) => {
    setSigners(signers.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSendToSign = async () => {
    setSending(true);
    setErrorMsg(null);
    try {
      // 1. Extrai o binário do documento Word aberto
      const docxBase64 = await getWordDocumentAsBase64();
      
      // 2. Envia ao backend que repassa à ZapSign
      const response = await axios.post('/api/esign/send', {
        document_name: "Contrato - Cláusula AI",
        file_base64: docxBase64,
        signers: signers.map(s => ({
          name: s.name,
          email: s.email,
          role: s.role
        }))
      });
      
      // 3. Sucesso real - ZapSign disparou os e-mails
      if (response.data?.success) {
        setSuccessMessage(response.data.message);
        setSignerResults(response.data.signers || []);
      } else {
        setErrorMsg(response.data?.message || 'Erro desconhecido');
      }
      
    } catch (e: any) {
      console.error(e);
      const detail = e?.response?.data?.detail || e?.message || 'Falha na comunicação';
      setErrorMsg(detail);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* Header Info */}
      <div className="p-4 bg-white border-b border-slate-200 text-center">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <PenTool className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-bold text-slate-800 mb-1">ZapSign Integrado</h2>
        <p className="text-2xs text-slate-500 leading-relaxed max-w-xs mx-auto">
          Colete assinaturas com validade legal diretamente do Microsoft Word via ZapSign.
        </p>
      </div>

      {successMessage ? (
        <div className="p-4 flex flex-col items-center justify-center text-center mt-2">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3 animate-slide-up" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">Enviado com Sucesso!</h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            {successMessage}
          </p>
          
          {/* Links individuais por signatário */}
          {signerResults.length > 0 && (
            <div className="w-full space-y-2 mb-4">
              {signerResults.map((sr, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-lg p-2.5 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-800">{sr.name}</span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">{sr.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-1.5">{sr.email}</p>
                  {sr.sign_url && (
                    <a 
                      href={sr.sign_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Abrir link de assinatura
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          <button 
            onClick={() => { setSuccessMessage(null); setSignerResults([]); }}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            Enviar novo documento
          </button>
        </div>
      ) : (
        <div className="p-4 space-y-4 pb-24">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Signatários</span>
            <button 
              onClick={addSigner}
              className="text-2xs font-semibold text-brand-600 flex items-center gap-1 hover:text-brand-700 transition-colors"
            >
              <UserPlus className="w-3 h-3" /> Adicionar
            </button>
          </div>

          <div className="space-y-3">
            {signers.map((signer, index) => (
              <div key={signer.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm relative animate-slide-up">
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {signer.role} {index + 1}
                </span>
                
                <div className="space-y-2 mt-2">
                  <div className="relative">
                    <UserPlus className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Nome completo"
                      value={signer.name}
                      onChange={e => updateSigner(signer.id, 'name', e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-shadow"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input 
                      type="email" 
                      placeholder="E-mail de envio"
                      value={signer.email}
                      onChange={e => updateSigner(signer.id, 'email', e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-shadow"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Erro */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg">
              <p className="text-[10px] text-red-800 leading-relaxed font-medium">
                <strong>Erro:</strong> {errorMsg}
              </p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg flex gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
              O documento será enviado à ZapSign para coleta de assinaturas eletrônicas com validade jurídica.
            </p>
          </div>

          <button
            onClick={handleSendToSign}
            disabled={sending || signers.some(s => !s.name || !s.email)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:bg-indigo-600"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Enviando à ZapSign...' : 'Enviar para Assinatura'}
          </button>
        </div>
      )}
    </div>
  );
}
