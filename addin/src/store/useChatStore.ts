import { create } from 'zustand';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
};

interface ChatState {
  messages: Message[];
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setMessages: (messages: Message[]) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Olá! Sou o Cláusula AI. Como posso ajudar com o seu contrato societário hoje?',
    }
  ],
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m))
  })),
  setMessages: (messages) => set({ messages }),
  resetChat: () => set({
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Olá! Sou o Cláusula AI. Como posso ajudar com o seu contrato societário hoje?',
      }
    ]
  }),
}));
