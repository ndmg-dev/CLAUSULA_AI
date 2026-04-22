import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { Taskpane } from './components/Taskpane';
import './index.css';

// Configura o endpoint do backend com fallback para o link de produção atual
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://api.clausulaai.nucleodigital.cloud';

/**
 * Entry Point do Word Add-in.
 * 
 * Office.onReady() é o "DOMContentLoaded" do mundo Office.js.
 * Ele aguarda o host (Word) confirmar que a API está pronta
 * ANTES de montar o React. Sem isso, Word.run() explode.
 */

// Declaração global para Office.js (carregado via CDN no HTML)
declare const Office: any;

Office.onReady((info: { host: string; platform: string }) => {
  console.log(`[Cláusula AI] Office.js pronto. Host: ${info.host}, Plataforma: ${info.platform}`);
  
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  
  root.render(
    <React.StrictMode>
      <Taskpane />
    </React.StrictMode>
  );
});
