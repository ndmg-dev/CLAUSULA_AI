/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Tipografia limpa, geométrica e extremamente legível para parágrafos densos
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Sotaque corporativo (Deep Blue/Indigo) para ações e branding
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Primary Focus
          600: '#2563eb', // Primary Hover
          700: '#1d4ed8',
          800: '#1e40af', // Corporate Deep Blue Muted
          900: '#1e3a8a', // Deepest Brand Accent
          950: '#172554',
        },
        // Setup de Backgrounds - Tons Neutros Ultra-Claros e Escuros com rigor
        workspace: {
          50: '#f8fafc', // Fundo predominante (Slate 50 modificado) para evitar branco puro que cansa a vista
          100: '#f1f5f9', // Divisões de áreas suaves
          200: '#e2e8f0', // Bordas delicadas
          300: '#cbd5e1', // Elementos inativos fortes
          400: '#94a3b8', // Ícones sutis
          500: '#64748b', // Textos secundários (Mutados)
          600: '#475569', // Textos com importância intermediária
          700: '#334155', // Textos primários leves
          800: '#1e293b', // Textos primários (Leitura principal documentada)
          900: '#0f172a', // Textos de ênfase máxima
          950: '#020617',
        },
        // Cores semânticas refinadas para uso em backgrounds com baixa opacidade e textos escuros
        health: {
          good: '#059669', // Emerald 600 - Sem saturação exagerada
          warning: '#d97706', // Amber 600
          danger: '#dc2626', // Red 600
        }
      },
      boxShadow: {
        // Sombras multicamadas "Apple-like" para profundidade pixel-perfect
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.02)',
        'floating': '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.03)',
        'focus': '0 0 0 2px rgba(255, 255, 255, 1), 0 0 0 4px rgba(59, 130, 246, 0.6)'
      }
    },
  },
  plugins: [
    typography,
  ],
}
