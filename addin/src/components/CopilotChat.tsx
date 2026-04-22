import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Plus, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { applySuggestion, getContractText } from '../services/wordInterface';
import { useChatStore, type Message } from '../store/useChatStore';

const SYSTEM_PROMPT = `Você é o Cláusula AI, um Analista Societário Sênior especialista em direito empresarial brasileiro, regras do DREI, Junta Comercial e enquadramento CNAE. Suas respostas devem ser diretas, técnicas e formatadas prontas para uso em contratos sociais. Evite jargões desnecessários, foque na aprovação do registro e na proteção patrimonial dos sócios.`;

export function CopilotChat() {
  const { messages, addMessage, updateMessage, setMessages } = useChatStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll suave para o final do chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

    // Adiciona o placeholder da mensagem da IA, marcado como streaming
    const aiMessageId = (Date.now() + 1).toString();
    addMessage({
      id: aiMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    });

    try {
      // Captura o texto atual do documento Word para dar "visão" à IA
      const docText = await getContractText();

      // Monta o payload com o histórico, inserindo o System Prompt no início
      const conversationHistory = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage.content }
      ].filter(m => m.role !== 'system' || m.content === SYSTEM_PROMPT);

      // Chamada para a API
      const baseUrl = import.meta.env.VITE_API_URL || 'https://api.clausulaai.nucleodigital.cloud';
      const response = await fetch(`${baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: conversationHistory,
          document_context: docText // Injeção de contexto dinâmico
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) throw new Error('Não foi possível inicializar o reader da stream.');

      let aiResponseText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Em muitas APIs (como OpenAI), o chunk pode vir no formato Server-Sent Events (SSE)
        // Se a sua API retorna texto puro por chunk, concatenamos direto.
        // Se retornar SSE (ex: data: {"content": "..."}), seria necessário fazer parse.
        // Assumindo texto puro ou texto já decodificado na stream de bytes do backend:
        aiResponseText += chunk;

        updateMessage(aiMessageId, { content: aiResponseText });
      }

      // Stream finalizada com sucesso
      updateMessage(aiMessageId, { isStreaming: false });

    } catch (error) {
      console.error('[CopilotChat] Erro na requisição:', error);
      updateMessage(aiMessageId, { 
        content: 'Desculpe, ocorreu um erro ao se comunicar com o motor da IA.', 
        isStreaming: false 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertToDocument = async (text: string) => {
    try {
      await applySuggestion(text);
    } catch (error) {
      console.error('[CopilotChat] Erro ao inserir no Word:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header do Chat */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2 sticky top-0 z-10 shadow-sm">
        <Sparkles className="w-4 h-4 text-brand-600" />
        <h2 className="text-sm font-bold text-slate-800">Copiloto Societário</h2>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-slim">
        {messages.map((msg) => {
          if (msg.role === 'system') return null;
          
          const isAI = msg.role === 'assistant';

          return (
            <div key={msg.id} className={`flex gap-3 max-w-[95%] ${isAI ? 'self-start' : 'self-end ml-auto flex-row-reverse'}`}>
              
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border shadow-sm ${
                isAI ? 'bg-brand-600 border-brand-700 text-white' : 'bg-slate-200 border-slate-300 text-slate-600'
              }`}>
                {isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>

              {/* Balão de Mensagem */}
              <div className="flex flex-col gap-1.5">
                <div className={`p-3 text-xs leading-relaxed shadow-sm ${
                  isAI 
                    ? 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm' 
                    : 'bg-brand-600 text-white rounded-2xl rounded-tr-sm'
                }`}>
                  <div className="prose prose-slate prose-xs max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="mb-0">{children}</li>,
                        strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-brand-500 align-middle animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Botão de Inserir no Word (Aparece apenas para IA e após terminar o streaming) */}
                {isAI && !msg.isStreaming && msg.id !== 'welcome' && (
                  <button
                    onClick={() => handleInsertToDocument(msg.content)}
                    className="self-start mt-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-2xs font-semibold text-brand-700 hover:bg-brand-50 hover:border-brand-200 transition-colors shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                    Inserir no Documento
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Área de Input */}
      <div className="bg-white border-t border-slate-200 p-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-400 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Peça para redigir uma cláusula..."
            className="flex-1 max-h-32 min-h-[40px] bg-transparent border-none text-xs text-slate-700 resize-none px-3 py-2.5 focus:ring-0 placeholder:text-slate-400"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-lg mb-0.5 mr-0.5 flex items-center justify-center transition-colors ${
              !input.trim() || isLoading
                ? 'bg-slate-200 text-slate-400'
                : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
            }`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="text-[9px] text-slate-400 uppercase tracking-wide font-medium">
            Cláusula AI pode cometer erros. Revise o conteúdo.
          </span>
        </div>
      </div>
    </div>
  );
}
