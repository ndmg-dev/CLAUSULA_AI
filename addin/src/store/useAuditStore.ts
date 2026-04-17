import { create } from 'zustand';

// ================================================================
// TIPAGENS DO DOMÍNIO SOCIETÁRIO
// ================================================================

export interface AuditIssue {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'Mild';
  clause_reference: string;
  /** Categoria contábil para agrupamento visual */
  category: 'DREI' | 'CNAE' | 'Capital' | 'Governança';
  /** Sugestão redigida pela IA para correção da cláusula */
  suggested_fix: string | null;
  is_omission: boolean;
}

export interface AuditSummary {
  executive_summary: string;
  risk_level: string;
}

export interface AuditResult {
  document_health_score: number;
  summary: AuditSummary;
  issues: AuditIssue[];
}

// ================================================================
// STORE ZUSTAND
// ================================================================

interface AuditState {
  // Status
  isAuditing: boolean;
  result: AuditResult | null;
  error: string | null;
  
  // Actions
  setAuditing: (v: boolean) => void;
  setResult: (r: AuditResult) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  isAuditing: false,
  result: null,
  error: null,
  
  setAuditing: (v) => set({ isAuditing: v, error: null }),
  setResult: (r) => set({ result: r, isAuditing: false }),
  setError: (e) => set({ error: e, isAuditing: false }),
  reset: () => set({ isAuditing: false, result: null, error: null }),
}));

// ================================================================
// DADOS MOCKADOS PARA TESTES SEM BACKEND
// ================================================================

export const MOCK_RESULT: AuditResult = {
  document_health_score: 58,
  summary: {
    executive_summary: "O contrato social apresenta deficiências estruturais que podem resultar em exigências no ato do registro na Junta Comercial. Foram identificados 4 pontos de atenção, sendo 2 de alta criticidade que impedem o registro sem ressalvas.",
    risk_level: "Alto",
  },
  issues: [
    {
      id: "issue_1",
      title: "Ausência de Cláusula de Responsabilidade Solidária",
      description: "O contrato não menciona a responsabilidade solidária dos sócios pelas obrigações sociais, conforme exigido pelo Art. 1.052 do Código Civil e Instrução Normativa DREI nº 81/2020.",
      severity: "Critical",
      clause_reference: "Cláusula Ausente",
      category: "DREI",
      suggested_fix: "CLÁUSULA [X] — DA RESPONSABILIDADE DOS SÓCIOS\nA responsabilidade de cada sócio é restrita ao valor de suas quotas, mas todos respondem solidariamente pela integralização do capital social, nos termos do Art. 1.052 do Código Civil.",
      is_omission: true,
    },
    {
      id: "issue_2",
      title: "Ambiguidade no Objeto Social vs. CNAE",
      description: "O objeto social menciona 'SERVIÇOS COMBINADOS DE ESCRITÓRIO E APOIO ADMINISTRATIVO' e 'ATIVIDADES DE CONTABILIDADE', mas não especifica os códigos CNAE correspondentes, o que pode gerar dificuldades no enquadramento tributário e na obtenção de alvarás.",
      severity: "Mild",
      clause_reference: "Cláusula Terceira — Do Objeto Social",
      category: "CNAE",
      suggested_fix: "O objeto social da sociedade será: a prestação de serviços combinados de escritório e apoio administrativo (CNAE 8211-3/00) e atividades de contabilidade (CNAE 6920-6/01).",
      is_omission: false,
    },
    {
      id: "issue_3",
      title: "Falta de Clareza na Integralização do Capital",
      description: "O contrato menciona que o capital está subscrito e integralizado, mas não especifica o prazo para integralização, o que é uma exigência do DREI.",
      severity: "Critical",
      clause_reference: "Cláusula Quinta — Do Capital Social",
      category: "Capital",
      suggested_fix: null,
      is_omission: false,
    },
    {
      id: "issue_4",
      title: "Ausência de Previsão de Distribuição Desproporcional de Lucros",
      description: "O contrato social não prevê a possibilidade de distribuição de lucros de forma desproporcional entre os sócios, o que pode ser uma prática desejada em algumas sociedades.",
      severity: "Mild",
      clause_reference: "Distribuição de Lucros",
      category: "Governança",
      suggested_fix: "CLÁUSULA [X] — DA DISTRIBUIÇÃO DE LUCROS\nOs lucros e prejuízos serão distribuídos entre os sócios na proporção de suas quotas, podendo ser deliberada distribuição desproporcional mediante aprovação unânime dos sócios em assembleia.",
      is_omission: true,
    },
  ],
};
