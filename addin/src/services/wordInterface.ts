/**
 * wordInterface.ts
 * 
 * Serviço de Comunicação com a API do Microsoft Word (Office.js).
 * Todas as interações com o documento Word passam por este módulo.
 * 
 * IMPORTANTE: Cada chamada Word.run() cria um contexto isolado (RequestContext).
 * Objetos do Word (ranges, paragraphs) DEVEM ser usados dentro do mesmo context.sync().
 * Nunca armazene referências de contexto entre chamadas.
 */

declare const Word: any;

/**
 * Lê TODO o texto do documento Word atualmente aberto.
 * Usado para enviar o contrato completo ao backend FastAPI para análise.
 * 
 * @returns string — Texto integral do documento, separado por \n entre parágrafos
 */
export async function getContractText(): Promise<string> {
  return Word.run(async (context: any) => {
    const body = context.document.body;
    body.load('text');
    await context.sync();
    
    const text = body.text || '';
    console.log(`[wordInterface] Texto extraído: ${text.length} caracteres`);
    return text;
  });
}

/**
 * Lê o texto do documento estruturado em parágrafos individuais.
 * Útil para mapeamento de posição e highlight futuro.
 * 
 * @returns Array de strings, cada uma representando um parágrafo
 */
export async function getContractParagraphs(): Promise<string[]> {
  return Word.run(async (context: any) => {
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load('text');
    await context.sync();
    
    const texts: string[] = [];
    for (let i = 0; i < paragraphs.items.length; i++) {
      const text = paragraphs.items[i].text.trim();
      if (text) {
        texts.push(text);
      }
    }
    
    console.log(`[wordInterface] ${texts.length} parágrafos extraídos`);
    return texts;
  });
}

/**
 * Insere texto sugerido pela IA na posição atual do cursor do usuário.
 * Não substitui conteúdo existente — adiciona no ponto de inserção.
 * 
 * @param suggestionText — O texto da sugestão IA a ser inserido
 */
export async function applySuggestion(suggestionText: string): Promise<void> {
  return Word.run(async (context: any) => {
    const selection = context.document.getSelection();
    
    // Insere APÓS a seleção atual para não sobrescrever texto existente
    selection.insertText(
      suggestionText,
      'After'  // 'Before' | 'After' | 'Replace' | 'Start' | 'End'
    );
    
    await context.sync();
    console.log(`[wordInterface] Sugestão inserida (${suggestionText.length} chars)`);
  });
}

/**
 * Substitui o parágrafo inteiro onde a cláusula-alvo foi encontrada
 * pela sugestão redigida da IA, de forma inteligente e sem depender do cursor.
 * 
 * @param searchText — O texto original da cláusula ou referência
 * @param newText — A redação corrigida via IA
 */
export async function replaceClauseIntelligently(searchText: string, newText: string): Promise<boolean> {
  return Word.run(async (context: any) => {
    const searchString = searchText.length > 60 ? searchText.substring(0, 60) : searchText;
    const results = context.document.body.search(searchString.trim(), {
      matchCase: false,
      matchWholeWord: false
    });
    
    results.load('items');
    await context.sync();
    
    if (results.items.length > 0) {
      const range = results.items[0];
      
      // Substituímos apenas o trecho encontrado pelo novo texto
      range.insertText(newText, 'Replace');
      range.font.highlightColor = 'None';
      
      await context.sync();
      console.log(`[wordInterface] Cláusula corrigida automaticamente (${newText.length} chars)`);
      return true;
    }
    
    return false;
  }).catch((e) => {
    console.error('[wordInterface] Erro ao substituir a cláusula inteligentemente', e);
    return false;
  });
}

/**
 * Insere uma cláusula nova no final do documento, após a última cláusula existente.
 * Usado para omissões (cláusulas que DEVERIAM existir mas não existem).
 * 
 * A função procura o último parágrafo significativo do documento e insere
 * logo após ele, com formatação de cabeçalho + corpo de cláusula.
 * 
 * @param clauseTitle — Ex: "CLÁUSULA DÉCIMA PRIMEIRA - DISTRIBUIÇÃO DE LUCROS"
 * @param clauseBody — O texto completo da nova cláusula
 */
export async function insertNewClauseAtPosition(clauseTitle: string, clauseBody: string): Promise<boolean> {
  return Word.run(async (context: any) => {
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load('items, text');
    await context.sync();

    // Procura de trás para frente o último parágrafo que contenha "Cláusula" 
    // para inserir logo após ele (mantendo a sequência do contrato)
    let insertAfterParagraph = null;
    for (let i = paragraphs.items.length - 1; i >= 0; i--) {
      const pText = paragraphs.items[i].text.toLowerCase();
      if (pText.includes('cláusula') || pText.includes('clausula')) {
        insertAfterParagraph = paragraphs.items[i];
        break;
      }
    }

    // Se não encontrou nenhuma cláusula, insere no final do body
    if (!insertAfterParagraph) {
      insertAfterParagraph = paragraphs.items[paragraphs.items.length - 1];
    }

    // Insere um espaço em branco + título em negrito + corpo da cláusula formatado
    const titleParagraph = insertAfterParagraph.insertParagraph('', 'After');
    
    const heading = titleParagraph.insertParagraph(clauseTitle.toUpperCase(), 'After');
    heading.font.bold = true;
    heading.font.size = 12;
    heading.alignment = 'Centered';
    
    const body = heading.insertParagraph(clauseBody, 'After');
    body.font.bold = false;
    body.font.size = 11;
    body.alignment = 'Justified';
    
    // Scroll até a nova cláusula para o sócio ver instantaneamente
    body.select();
    
    await context.sync();
    console.log(`[wordInterface] Nova cláusula inserida: "${clauseTitle}" (${clauseBody.length} chars)`);
    return true;
  }).catch((e) => {
    console.error('[wordInterface] Erro ao inserir nova cláusula', e);
    return false;
  });
}

/**
 * Foca a tela do Word nativamente no trecho passado sem pintar o documento.
 * Ideal para 'onMouseEnter' dos cards.
 * 
 * @param searchText — Texto a ser focado
 */
export async function focusClause(searchText: string): Promise<boolean> {
  return Word.run(async (context: any) => {
    // Extraímos os primeiros ~60 caracteres para mitigar quebras de linha/espaços ocultos
    const searchString = searchText.length > 60 ? searchText.substring(0, 60) : searchText;

    const results = context.document.body.search(searchString.trim(), {
      matchCase: false,
      matchWholeWord: false
    });
    
    results.load('length');
    await context.sync();
    
    if (results.items.length > 0) {
      const range = results.items[0];
      // A mágica: select() auto-scrolla a Viewport para o usuário instantaneamente
      range.select();
      await context.sync();
      return true;
    }
    
    return false;
  }).catch(() => false);
}

/**
 * Busca e destaca um trecho no documento (highlight amarelo).
 * Usado para guiar o usuário até a cláusula com problema.
 * 
 * @param searchText — Texto a ser encontrado e destacado
 */
export async function highlightClause(searchText: string): Promise<boolean> {
  return Word.run(async (context: any) => {
    const results = context.document.body.search(searchText, {
      matchCase: false,
      matchWholeWord: false
    });
    
    results.load('length');
    await context.sync();
    
    if (results.items.length > 0) {
      // Destaca o primeiro match com amarelo
      const range = results.items[0];
      range.font.highlightColor = 'Yellow';
      range.select();
      await context.sync();
      console.log(`[wordInterface] Cláusula encontrada e destacada`);
      return true;
    }
    
    console.warn(`[wordInterface] Cláusula não encontrada: "${searchText.slice(0, 50)}..."`);
    return false;
  });
}

/**
 * Remove todos os highlights amarelos do documento.
 * Chamada de "limpeza" após o usuário resolver as pendências.
 */
export async function clearAllHighlights(): Promise<void> {
  return Word.run(async (context: any) => {
    const body = context.document.body;
    body.font.highlightColor = 'None';
    await context.sync();
    console.log(`[wordInterface] Todos os highlights removidos`);
  });
}

/**
 * Instancia um modelo base inteiro no documento Word atual.
 * Atenção: O parâmetro html fará replace total do documento atual se houver.
 */
export async function insertTemplateToDocument(htmlContent: string): Promise<void> {
  return Word.run(async (context: any) => {
    const body = context.document.body;
    // 'Replace' sobrepõe tudo que existe com o novo template
    body.insertHtml(htmlContent, 'Replace');
    await context.sync();
    console.log(`[wordInterface] Modelo instanciado com sucesso (${htmlContent.length} bytes)`);
  });
}

/**
 * Insere um comentário nativo no Microsoft Word no trecho da cláusula correspondente.
 * Trás a Colaboração para o ciclo de vida da elaboração do contrato.
 */
export async function insertCommentToClause(searchText: string, commentText: string): Promise<boolean> {
  return Word.run(async (context: any) => {
    const searchString = searchText.length > 60 ? searchText.substring(0, 60) : searchText;
    const results = context.document.body.search(searchString.trim(), {
      matchCase: false,
      matchWholeWord: false
    });
    
    results.load('length');
    await context.sync();
    
    if (results.items.length > 0) {
      const range = results.items[0];
      // API oficial para Inserir Comentários (Requer WordApi 1.4+)
      range.insertComment(commentText);
      await context.sync();
      return true;
    }
    return false;
  }).catch((e) => {
    console.error('[wordInterface] Erro ao inserir comentário nativo', e);
    return false;
  });
}

/**
 * Extrai o documento Word inteiro em formato Base64 (.docx compactado).
 * Vital para enviar para assinaturas eletrônicas (Cofre Cloud / E-sign).
 */
export async function getWordDocumentAsBase64(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Usamos Office.context (antigo) por conta de suporte cross-version para getFileAsync
    Office.context.document.getFileAsync(Office.FileType.Compressed, { sliceSize: 65536 }, (result: any) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        const file = result.value;
        const slicesCount = file.sliceCount;
        let docData: any[] = [];
        let slicesReceived = 0;

        const getSlice = (sliceIndex: number) => {
          file.getSliceAsync(sliceIndex, (sliceResult: any) => {
            if (sliceResult.status === Office.AsyncResultStatus.Succeeded) {
              docData = docData.concat(sliceResult.value.data);
              slicesReceived++;
              if (slicesReceived === slicesCount) {
                file.closeAsync();
                
                // Conversão byte array para base64
                let binary = '';
                for (let i = 0; i < docData.length; i++) {
                  binary += String.fromCharCode(docData[i]);
                }
                resolve(btoa(binary));
              } else {
                getSlice(sliceIndex + 1);
              }
            } else {
              file.closeAsync();
              reject(new Error(sliceResult.error.message));
            }
          });
        };
        getSlice(0);
      } else {
        reject(new Error(result.error.message));
      }
    });
  });
}
