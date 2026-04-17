import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect, useState } from 'react'
import { useAnalysisStore } from '../../store/useAnalysisStore'
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, AlignLeft, AlignCenter, AlignJustify, FileDown, Loader2 } from 'lucide-react'
import axios from 'axios'

export function DocumentEditor() {
  const { result, setEditorInjector } = useAnalysisStore()
  const [isExporting, setIsExporting] = useState(false)

  // Inicializa a folha A4 com o conteúdo integral do contrato varrido na etapa de OCR (Backend)
  const rawText = result?.original_text || '';
  const initialContent = rawText
    ? rawText.split('\n\n').map(p => `<p>${p}</p>`).join('')
    : '';

  const exportToWord = async () => {
    if (!editor) return;
    setIsExporting(true);
    try {
      const response = await axios.post(
        'http://localhost:8000/api/export/word',
        { html_content: editor.getHTML(), filename: 'contrato_clausula_ai' },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'contrato_clausula_ai.docx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Falha ao exportar Word:', e);
      alert('Erro ao gerar o arquivo Word. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Comece a redigir o contrato ou aguarde a extração da inteligência...',
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-slate prose-lg max-w-none focus:outline-none min-h-[1000px]',
      },
    },
  })

  useEffect(() => {
    if (editor) {
      setEditorInjector((text: string) => {
        editor.chain().focus().insertContent(`<p><strong>Sugestão Injetada:</strong> ${text}</p>`).run()
      })
    }
  }, [editor, setEditorInjector])

  if (!editor) {
    return null
  }

  const ToolbarButton = ({ onClick, isActive, children }: any) => (
    <button
      onClick={onClick}
      className={`p-2 rounded hover:bg-slate-200 transition-colors flex items-center justify-center ${isActive ? 'bg-slate-200 text-brand-700 font-semibold shadow-inner' : 'text-slate-600'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full bg-slate-100 border border-slate-300 rounded-lg overflow-hidden flex flex-col shadow-inner">
      
      {/* Toolbar Fixa (Estilo Word) */}
      <div className="bg-slate-50 border-b border-slate-300 px-4 py-2 flex items-center gap-1 flex-wrap sticky top-0 z-10 shadow-sm">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-slate-300 mx-2" />
        
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })}>
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })}>
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-slate-300 mx-2" />
        
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-slate-300 mx-2" />
        
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })}>
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })}>
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })}>
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>

        {/* Separador + Botão Word no extremo direito */}
        <div className="ml-auto flex items-center gap-2">
          <div className="w-px h-6 bg-slate-300 mx-1" />
          <button
            onClick={exportToWord}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            title="Exportar documento atual para Word (.docx)"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            {isExporting ? 'Gerando...' : 'Exportar .docx'}
          </button>
        </div>
      </div>

      {/* Papel A4 Digital */}
      <div className="w-full bg-slate-100 flex justify-center py-10 overflow-y-auto">
        <div className="bg-white shadow-xl max-w-[816px] w-full mx-auto min-h-[1056px] p-16 text-justify text-slate-800 leading-relaxed outline-none border border-slate-200">
           <EditorContent editor={editor} />
        </div>
      </div>

    </div>
  )
}
