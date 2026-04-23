# 📘 Cláusula AI — Guia de Instalação no Word Desktop

> **Versão:** 1.0 | **Última Atualização:** Abril/2026  
> **Público-Alvo:** Colaboradores do escritório contábil que utilizarão o Cláusula AI no Microsoft Word instalado no computador (Windows).

---

## 📋 Pré-requisitos

Antes de começar, confirme que o computador atende aos seguintes requisitos:

| Requisito | Mínimo |
|---|---|
| **Microsoft Word** | Versão 2016 ou superior (Desktop, não a versão da Microsoft Store) |
| **Sistema Operacional** | Windows 10 ou superior |
| **Internet** | Conexão ativa (o Cláusula AI se comunica com o servidor na nuvem) |
| **Arquivo necessário** | `manifest.xml` (fornecido pelo administrador do sistema) |

> [!IMPORTANT]
> O arquivo `manifest.xml` é o único arquivo necessário para a instalação. Ele funciona como um "atalho" que conecta o Word ao sistema Cláusula AI hospedado na nuvem. **Não contém dados sensíveis** e pode ser enviado por e-mail, Teams ou pendrive.

---

## 🚀 Passo a Passo de Instalação

### Passo 1 — Preparar a Pasta Local

1. Abra o **Explorador de Arquivos** (Windows + E).
2. Navegue até `C:\` (raiz do disco).
3. Crie uma nova pasta chamada **`SuplementosWord`**.
   - Clique com o botão direito no espaço vazio → **Novo** → **Pasta**.
   - O caminho final deve ser: `C:\SuplementosWord`.
4. **Copie o arquivo `manifest.xml`** recebido para dentro dessa pasta.

> [!TIP]
> Você pode criar a pasta em qualquer local (ex: Área de Trabalho), mas recomendamos `C:\SuplementosWord` por ser um caminho padronizado em todos os computadores do escritório.

---

### Passo 2 — Compartilhar a Pasta

O Word exige que a pasta esteja "compartilhada" para reconhecê-la como catálogo de suplementos, mesmo que o compartilhamento seja consigo mesmo.

1. Clique com o **botão direito** na pasta `SuplementosWord` → **Propriedades**.
2. Vá na aba **Compartilhamento**.
3. Clique no botão **Compartilhar...**.
4. Na caixa de texto, digite o nome do **seu usuário do Windows** (o mesmo que aparece na tela de login).
5. Clique em **Adicionar** e depois em **Compartilhar**.
6. O Windows mostrará um **Caminho de Rede**, algo como:

```
\\NOME-DO-SEU-PC\SuplementosWord
```

7. **Copie esse caminho** (selecione e pressione `Ctrl+C`). Você precisará dele no próximo passo.
8. Clique em **Concluído** e depois em **Fechar**.

> [!WARNING]
> Se o botão "Compartilhar" não aparecer ou estiver desativado, entre em contato com o suporte de TI — pode ser uma restrição de política de grupo no computador.

---

### Passo 3 — Configurar o Word para Confiar na Pasta

1. Abra o **Microsoft Word**.
2. Clique em **Arquivo** (canto superior esquerdo).
3. Clique em **Opções** (no final do menu lateral esquerdo).
4. Na janela que abrir, clique em **Central de Confiabilidade** (no menu lateral).
5. Clique no botão **Configurações da Central de Confiabilidade...**.
6. No menu lateral da nova janela, clique em **Catálogos de Suplementos Confiáveis**.
7. No campo **"URL do Catálogo"**, **cole o caminho de rede** que você copiou no Passo 2 (ex: `\\NOME-DO-SEU-PC\SuplementosWord`).
8. Clique no botão **Adicionar Catálogo**.
9. O caminho aparecerá na lista abaixo. **Marque a caixinha "Mostrar no Menu"** ao lado dele.
10. Clique em **OK** em todas as janelas abertas.
11. **Feche o Word completamente** (Arquivo → Fechar ou Alt+F4).

> [!CAUTION]
> Se você não marcar a caixa "Mostrar no Menu", o suplemento não aparecerá na lista de suplementos disponíveis, mesmo que a pasta esteja configurada corretamente.

---

### Passo 4 — Instalar o Suplemento

1. **Abra o Word novamente** (pode ser um documento em branco).
2. Na faixa de opções (Ribbon), clique na aba **Inserir**.
3. Clique em **Meus Suplementos** (ou "Obter Suplementos" em algumas versões).
4. Na janela que abrir, clique na aba **PASTA COMPARTILHADA**.
5. O suplemento **"Cláusula AI — Auditoria"** aparecerá na lista.
6. Selecione-o e clique em **Adicionar**.

> [!NOTE]
> Na primeira vez, o Word pode levar alguns segundos para carregar o painel lateral. Aguarde até ver o logotipo do Cláusula AI e a mensagem "Auditoria Societária • DREI" no cabeçalho.

---

## ✅ Verificação Pós-Instalação

Após instalar, verifique se tudo está funcionando:

| Verificação | Esperado |
|---|---|
| Aba **"Cláusula AI"** visível no Ribbon | ✅ Sim |
| Painel lateral abre ao clicar em "Auditoria Societária" | ✅ Sim |
| Botões de navegação na parte inferior: **Auditoria, Modelos, E-Sign, Copiloto** | ✅ Sim, todos os 4 |
| Aba "Copiloto" responde a mensagens | ✅ Sim (requer internet) |

---

## 🔄 Como Atualizar o Suplemento

Quando uma nova versão do Cláusula AI for lançada:

- **Se a atualização for apenas de funcionalidades** (código da interface/backend): **Não precisa fazer nada**. O Word carrega a versão mais recente diretamente do servidor na nuvem toda vez que o painel é aberto.

- **Se a atualização envolver mudanças no `manifest.xml`** (novas permissões, novos ícones, etc.): Basta **substituir o arquivo `manifest.xml`** na pasta `C:\SuplementosWord` pelo novo arquivo recebido e **reiniciar o Word**.

---

## 🔧 Solução de Problemas

### "Não é possível se conectar ao catálogo"

**Causa:** O Word não consegue acessar a pasta compartilhada.

**Solução:**
1. Abra o **Explorador de Arquivos** e digite o caminho de rede na barra de endereço (ex: `\\NOME-DO-PC\SuplementosWord`).
2. Se pedir senha, use as credenciais do seu login do Windows.
3. Se der erro, refaça o Passo 2 (compartilhamento).
4. No Word, vá em **Arquivo → Opções → Central de Confiabilidade → Configurações → Locais Confiáveis** e marque a opção **"Permitir Locais Confiáveis na minha rede"**.

---

### O suplemento não aparece na "Pasta Compartilhada"

**Causa:** O catálogo não foi marcado para exibição.

**Solução:**
1. Vá em **Arquivo → Opções → Central de Confiabilidade → Configurações → Catálogos de Suplementos Confiáveis**.
2. Verifique se o caminho está na lista e se a caixa **"Mostrar no Menu"** está marcada.
3. Se o caminho não estiver lá, adicione-o novamente (Passo 3).

---

### O painel lateral fica branco ou com erro

**Causa:** Problema de conexão com o servidor ou cache do Word.

**Solução:**
1. Verifique se o computador tem acesso à internet.
2. Teste acessando `https://addin.clausulaai.nucleodigital.cloud` no navegador — deve carregar uma página.
3. Feche o Word, limpe o cache do Office:
   - Pressione `Windows + R`, digite `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\` e apague todo o conteúdo da pasta.
   - Reabra o Word.

---

### O Copiloto responde com erro

**Causa:** O backend pode estar em manutenção ou a chave de IA expirou.

**Solução:**
1. Teste o endpoint de saúde: acesse `https://api.clausulaai.nucleodigital.cloud/api/health` no navegador.
2. Se retornar `{"status": "healthy"}`, o backend está ativo. Tente novamente.
3. Se retornar erro, entre em contato com o administrador do sistema.

---

## 📞 Suporte

Em caso de dúvidas ou problemas não listados acima, entre em contato com a equipe de desenvolvimento:

- **E-mail:** suporte@nucleodigital.cloud
- **Responsável Técnico:** Equipe NDMG Dev

---

> **Cláusula AI** — Auditoria Societária Inteligente  
> *Desenvolvido por Núcleo Digital*
