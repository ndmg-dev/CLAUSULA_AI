import { create } from 'zustand';
import { AnalysisResult } from '../types/api';
import axios from 'axios';

interface AnalysisState {
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  error: string | null;
  selectedFile: File | null;
  hoveredIssueIndex: number | null;
  insertTextToEditor: ((text: string) => void) | null;
  isEditMode: boolean;
  
  analyzeDocument: (file: File) => Promise<void>;
  setHoveredIssue: (index: number | null) => void;
  setEditorInjector: (fn: (text: string) => void) => void;
  setEditMode: (mode: boolean) => void;
  reset: () => void;
}

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
});

// A Store central agora governa o PDF fisicamente e os Index de highlight do hover do Mouse
export const useAnalysisStore = create<AnalysisState>((set) => ({
  isAnalyzing: false,
  result: null,
  error: null,
  selectedFile: null,
  hoveredIssueIndex: null,
  isEditMode: false,
  
  insertTextToEditor: null,
  
  analyzeDocument: async (file: File) => {
    try {
      set({ isAnalyzing: true, error: null, result: null, selectedFile: file, hoveredIssueIndex: null, isEditMode: false });
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post<AnalysisResult>('/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      set({ result: response.data, isAnalyzing: false });
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Falha sistêmica da IA.';
      set({ error: msg, isAnalyzing: false, selectedFile: null });
    }
  },

  setHoveredIssue: (index) => set({ hoveredIssueIndex: index }),

  setEditorInjector: (fn) => set({ insertTextToEditor: fn }),
  
  setEditMode: (mode) => set({ isEditMode: mode }),

  reset: () => set({ result: null, error: null, isAnalyzing: false, selectedFile: null, hoveredIssueIndex: null, insertTextToEditor: null, isEditMode: false })
}));
