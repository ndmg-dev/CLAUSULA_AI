import { useState } from 'react';
import { BookTemplate, Search, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { insertTemplateToDocument } from '../services/wordInterface';

// Mock DB de Templates
interface Template {
  id: string;
  title: string;
  description: string;
  category: 'Trabalhista' | 'Societário' | 'Geral';
  htmlBase: string;
}

const TEMPLATE_DB: Template[] = [
  {
    id: 't1',
    title: 'Contrato Social Padrão DREI',
    description: 'Um contrato social validado pelo DREI para não obter exigências na Junta Comercial.',
    category: 'Societário',
    htmlBase: `
      <div style="font-family: 'Calibri', 'Arial', sans-serif; color: #000; line-height: 1.5; font-size: 11pt;">
        <h1 style="text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 20pt; text-transform: uppercase;">CONTRATO SOCIAL DE [NOME EMPRESARIAL] LTDA</h1>
        <p style="text-align: justify; margin-bottom: 15pt;">Pelo presente instrumento particular, as partes abaixo qualificadas:</p>
        <p style="text-align: justify; margin-bottom: 10pt;"><strong>[NOME COMPLETO DO SÓCIO 1]</strong>, [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [●], inscrito(a) no CPF nº [●], residente e domiciliado(a) à [endereço completo];</p>
        <p style="text-align: justify; margin-bottom: 10pt;"><strong>[NOME COMPLETO DO SÓCIO 2]</strong>, [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [●], inscrito(a) no CPF nº [●], residente e domiciliado(a) à [endereço completo];</p>
        <p style="text-align: justify; margin-bottom: 20pt;">resolvem constituir uma sociedade empresária limitada, que se regerá pelas disposições legais aplicáveis e pelas cláusulas seguintes:</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 1 — DENOMINAÇÃO, SEDE, FORO E PRAZO</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">A sociedade girará sob a denominação empresarial <strong>[NOME EMPRESARIAL] LTDA</strong>, com sede na [endereço completo], podendo abrir, transferir e encerrar filiais, agências, escritórios ou representações em qualquer parte do território nacional ou no exterior, mediante deliberação dos sócios.</p>
        <p style="text-align: justify; margin-bottom: 15pt; text-indent: 30pt;">Parágrafo único. O prazo de duração da sociedade é indeterminado, iniciando-se suas atividades na data do arquivamento deste contrato perante a Junta Comercial competente.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 2 — OBJETO SOCIAL</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">A sociedade terá por objeto social: [descrever com clareza as atividades econômicas a serem exercidas, compatíveis com os CNAEs escolhidos].</p>
        <p style="text-align: justify; margin-bottom: 15pt; text-indent: 30pt;">Parágrafo único. A sociedade poderá praticar todos os atos necessários ao cumprimento de seu objeto social, desde que observada a legislação aplicável.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 3 — CAPITAL SOCIAL</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">O capital social é de <strong>R$ [valor] ([valor por extenso])</strong>, dividido em [número] quotas no valor nominal de R$ [valor] cada uma, totalmente subscrito e integralizado, neste ato, em moeda corrente nacional, ficando assim distribuído entre os sócios:</p>
        <p style="text-align: justify; margin-bottom: 5pt;"><strong>Sócio [1]:</strong> [número] quotas, no valor total de R$ [valor], correspondentes a [●]% do capital social;</p>
        <p style="text-align: justify; margin-bottom: 10pt;"><strong>Sócio [2]:</strong> [número] quotas, no valor total de R$ [valor], correspondentes a [●]% do capital social.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 4 — RESPONSABILIDADE DOS SÓCIOS</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">A responsabilidade de cada sócio é restrita ao valor de suas quotas, mas todos respondem solidariamente pela integralização do capital social, na forma da lei.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 5 — ADMINISTRAÇÃO</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">A administração da sociedade caberá a <strong>[nome do administrador]</strong>, na qualidade de administrador(a), com poderes para praticar todos os atos necessários à gestão da sociedade.</p>
        <p style="text-align: justify; margin-bottom: 10pt; text-indent: 30pt;">Parágrafo 1º — Limitações: Dependem de aprovação dos sócios representando mais de [●]% do capital social os seguintes atos: a) venda ou oneração de bens imóveis; b) prestação de garantias em favor de terceiros; c) contratação de empréstimos acima de R$ [●]; d) ingresso de novos sócios; e) incorporação, fusão, cisão, dissolução ou transformação da sociedade.</p>
        <p style="text-align: justify; margin-bottom: 15pt; text-indent: 30pt;">Parágrafo 2º — Declaração de desimpedimento: O(a) administrador(a) declara, sob as penas da lei, que não está impedido(a) de exercer a administração da sociedade.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 6 — PRÓ-LABORE</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">O(a) administrador(a) poderá receber pró-labore mensal, em valor a ser fixado por deliberação dos sócios, observada a legislação tributária e previdenciária aplicável.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 7 — DELIBERAÇÕES SOCIAIS</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">As deliberações sociais serão tomadas em reunião ou assembleia, quando exigido por lei, observados os quóruns legais e contratuais.</p>
        <p style="text-align: justify; margin-bottom: 15pt; text-indent: 30pt;">Parágrafo único. Poderão os sócios formalizar deliberações por escrito, mediante assinatura de todos os sócios ou dos sócios detentores do quórum necessário, quando a legislação permitir.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 8 — CESSÃO E TRANSFERÊNCIA DE QUOTAS</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">A cessão ou transferência de quotas a terceiros estranhos ao quadro social dependerá de aprovação dos sócios representando, no mínimo, [●]% do capital social, assegurado aos sócios remanescentes o direito de preferência, em igualdade de condições e preço.</p>
        <p style="text-align: justify; margin-bottom: 10pt; text-indent: 30pt;">Parágrafo 1º: O sócio que desejar ceder, transferir ou onerar suas quotas deverá comunicar os demais sócios, por escrito, informando quantidade de quotas, preço, condições de pagamento e demais termos da operação.</p>
        <p style="text-align: justify; margin-bottom: 15pt; text-indent: 30pt;">Parágrafo 2º: Os demais sócios terão o prazo de [30] dias para exercer o direito de preferência, proporcionalmente à participação de cada um, salvo renúncia expressa.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 9 — RETIRADA, EXCLUSÃO E FALECIMENTO DE SÓCIO</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">No caso de retirada, exclusão, incapacidade ou falecimento de sócio, a sociedade não se dissolverá, prosseguindo com os sócios remanescentes.</p>
        <p style="text-align: justify; margin-bottom: 10pt; text-indent: 30pt;">Parágrafo 1º — Haveres: Os haveres do sócio retirante, excluído, incapaz ou falecido serão apurados com base em balanço especialmente levantado na data do evento.</p>
        <p style="text-align: justify; margin-bottom: 15pt; text-indent: 30pt;">Parágrafo 2º — Pagamento: O pagamento dos haveres será efetuado em [número] parcelas mensais, iguais e sucessivas.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 10 — EXERCÍCIO SOCIAL, DEMONSTRAÇÕES E LUCROS</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">O exercício social encerra-se em 31 de dezembro de cada ano, quando serão levantadas as demonstrações contábeis da sociedade.</p>
        <p style="text-align: justify; margin-bottom: 10pt; text-indent: 30pt;">Parágrafo 1º: Os lucros apurados poderão ser distribuídos aos sócios na proporção de suas quotas, salvo deliberação unânime em sentido diverso.</p>
        <p style="text-align: justify; margin-bottom: 15pt; text-indent: 30pt;">Parágrafo 2º: A sociedade poderá levantar balanços intermediários e distribuir lucros intercalares ou antecipados.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 11 — AUMENTO E REDUÇÃO DE CAPITAL</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">O capital social poderá ser aumentado ou reduzido por deliberação dos sócios, observadas as formalidades legais e assegurado o direito de preferência dos sócios.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 12 — DISSOLUÇÃO E LIQUIDAÇÃO</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">A sociedade será dissolvida nos casos previstos em lei ou por deliberação dos sócios, procedendo-se à liquidação na forma legal.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 13 — FORO</h2>
        <p style="text-align: justify; margin-bottom: 30pt;">Fica eleito o foro da Comarca de [cidade/UF], com renúncia de qualquer outro, por mais privilegiado que seja, para dirimir dúvidas oriundas deste contrato.</p>

        <p style="margin-top: 40pt;">[Local], [data].</p>
        <div style="margin-top: 30pt; text-align: left;">
          <p>__________________________________________<br><strong>[Sócio 1]</strong></p>
          <p style="margin-top: 20pt;">__________________________________________<br><strong>[Sócio 2]</strong></p>
        </div>
      </div>
    `
  },
  {
    id: 't2',
    title: 'Acordo de Quotistas (Anti-Diluição)',
    description: 'Estrutura premium para garantir direitos de preferência, Tag/Drag Along e fórmulas anti-diluição.',
    category: 'Societário',
    htmlBase: `
      <div style="font-family: 'Calibri', 'Arial', sans-serif; color: #000; line-height: 1.5; font-size: 11pt;">
        <h1 style="text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 20pt; text-transform: uppercase;">ACORDO DE QUOTISTAS DA [NOME DA SOCIEDADE] LTDA</h1>
        <p style="text-align: justify; margin-bottom: 15pt;">Pelo presente instrumento particular, de um lado:</p>
        <p style="text-align: justify; margin-bottom: 5pt;"><strong>[NOME DO QUOTISTA 1]</strong>, [qualificação completa];</p>
        <p style="text-align: justify; margin-bottom: 5pt;"><strong>[NOME DO QUOTISTA 2]</strong>, [qualificação completa];</p>
        <p style="text-align: justify; margin-bottom: 5pt;"><strong>[NOME DO INVESTIDOR / QUOTISTA PROTEGIDO]</strong>, [qualificação completa];</p>
        <p style="text-align: justify; margin-bottom: 15pt;">e, na qualidade de interveniente anuente, <strong>[NOME DA SOCIEDADE] LTDA</strong>, sociedade empresária limitada com sede em [endereço], inscrita no CNPJ nº [●], neste ato representada na forma de seu contrato social, têm entre si justo e acordado o presente Acordo de Quotistas, que se regerá pelas cláusulas seguintes:</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 1 — OBJETO</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">O presente Acordo tem por objeto regular direitos e obrigações dos quotistas relativamente a: a) proteção anti-diluição; b) direito de preferência em aumentos de capital; c) restrições à transferência de quotas; d) regras de governança e matérias sujeitas a aprovação; e) [opcional] tag along, drag along, call option e put option.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 2 — DEFINIÇÕES</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Para os fins deste Acordo, termos como "Rodada de Captação", "Down Round", "Preço de Referência" e "Quotista Protegido" terão os significados atribuídos conforme as definições padrão de mercado e as especificações deste instrumento.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 3 — DIREITO DE PREFERÊNCIA</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">Em qualquer aumento de capital da sociedade, os quotistas terão direito de preferência para subscrição de novas quotas, na proporção de suas participações.</p>
        <p style="text-align: justify; margin-bottom: 15pt; text-indent: 30pt;">Parágrafo único. A sociedade deverá comunicar os quotistas por escrito, com antecedência mínima de [15] dias, sobre a proposta de aumento de capital.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 4 — PROTEÇÃO ANTI-DILUIÇÃO</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">Na hipótese de ocorrência de Down Round, o Quotista Protegido fará jus ao ajuste econômico de sua participação, de modo a mitigar os efeitos dilutivos da nova emissão.</p>
        <p style="text-align: justify; margin-bottom: 10pt; text-indent: 30pt;"><strong>Parágrafo 1º — Modalidade escolhida:</strong> A proteção anti-diluição observará a seguinte metodologia:</p>
        <p style="text-align: justify; margin-bottom: 5pt; text-indent: 60pt;"><em>Opção A — Full Ratchet: Ajuste pelo menor preço praticado na nova rodada.</em></p>
        <p style="text-align: justify; margin-bottom: 10pt; text-indent: 60pt;"><em>Opção B — Média Ponderada: Ajuste baseado na média ponderada de todas as emissões.</em></p>
        <p style="text-align: justify; margin-bottom: 10pt; text-indent: 30pt;"><strong>Parágrafo 2º — Forma de implementação:</strong> A implementação poderá se dar por emissão de quotas adicionais, bonificação ou outro mecanismo equivalente.</p>
        <p style="text-align: justify; margin-bottom: 15pt; text-indent: 30pt;"><strong>Parágrafo 3º — Prazos:</strong> A recomposição deverá ser formalizada em até [30] dias contados da aprovação da operação.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 5 — HIPÓTESES EXCLUÍDAS DA ANTI-DILUIÇÃO</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Não caracterizam Down Round emissões de quotas em reorganizações societárias sem captação, planos de incentivo (ESOP) previamente aprovados ou obrigações legais.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 6 — MATÉRIAS SUJEITAS À APROVAÇÃO QUALIFICADA</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Dependem da aprovação de quotistas representando, no mínimo, [●]% do capital social matérias como aumento de capital, fusões e alterações estruturais.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 7 — RESTRIÇÃO À TRANSFERÊNCIA DE QUOTAS</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Nenhum quotista poderá vender suas quotas sem observar o direito de preferência dos demais quotistas.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 8 — TAG ALONG</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Minorias têm o direito de acompanhar a venda do bloco de controle pelo mesmo preço.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 9 — DRAG ALONG</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">O bloco de controle pode obrigar a minoria a vender suas quotas em caso de venda da sociedade.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 10 — CALL OPTION E PUT OPTION</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Cláusulas de opção de compra e venda aplicáveis conforme eventos de gatilho.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 11 — CONFIDENCIALIDADE</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Os quotistas obrigam-se a manter sigilo absoluto sobre os termos deste Acordo e informações estratégicas da sociedade.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 12 — PRAZO E VIGÊNCIA</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Vigência pelo prazo de [●] anos ou enquanto houver participação societária.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 13 — INADIMPLEMENTO E EXECUÇÃO ESPECÍFICA</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Sanções em caso de descumprimento das regras de transferência ou voto.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 14 — SOLUÇÃO DE CONTROVÉRSIAS</h2>
        <p style="text-align: justify; margin-bottom: 30pt;">Eleição do foro ou câmara de arbitragem de [cidade/UF].</p>

        <div style="margin-top: 40pt; text-align: center;">
          <p>[Local], [data].</p>
          <p style="margin-top: 30pt;">_____________________________<br><strong>Assinaturas das Partes</strong></p>
        </div>
      </div>
    `
  },
  {
    id: 't3',
    title: 'Contrato de Prestação de Serviços (B2B)',
    description: 'Termo comercial avançado com cláusulas de PI, LGPD, Confidencialidade e Limitação de Responsabilidade.',
    category: 'Geral',
    htmlBase: `
      <div style="font-family: 'Calibri', 'Arial', sans-serif; color: #000; line-height: 1.5; font-size: 11pt;">
        <h1 style="text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 20pt; text-transform: uppercase;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
        <p style="text-align: justify; margin-bottom: 10pt;"><strong>CONTRATANTE:</strong> [NOME DA EMPRESA], pessoa jurídica inscrita no CNPJ nº [●].</p>
        <p style="text-align: justify; margin-bottom: 15pt;"><strong>CONTRATADA:</strong> [NOME DA PRESTADORA], pessoa jurídica inscrita no CNPJ nº [●].</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 1 — OBJETO</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">Prestação de serviços de [descrever os serviços], conforme Anexo I deste instrumento.</p>
        <p style="text-align: justify; margin-bottom: 15pt; text-indent: 30pt;">Parágrafo único. Qualquer serviço não previsto será considerado escopo adicional.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 2 — NATUREZA DA RELAÇÃO</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">A CONTRATADA executará os serviços com autonomia técnica, sem vínculo de subordinação jurídica.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 3 — PRAZO</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">O contrato vigorará por [prazo] iniciando-se em [data].</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 4 — PREÇO E CONDIÇÕES DE PAGAMENTO</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Pelos serviços contratados, a CONTRATANTE pagará à CONTRATADA o valor de R$ [●].</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 5 — TRIBUTOS E RETENÇÕES</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Responsabilidade tributária de cada parte conforme legislação vigente.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 6 — OBRIGAÇÕES DA CONTRATADA</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Execução diligente, sigilo e cumprimento de prazos.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 7 — OBRIGAÇÕES DA CONTRATANTE</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Fornecimento de informações e pagamento pontual.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 8 — ACEITE DOS SERVIÇOS</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Critérios de validação e prazos para contestação técnica.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 9 — CONFIDENCIALIDADE (NDA)</h2>
        <p style="text-align: justify; margin-bottom: 10pt;">As partes obrigam-se a manter sigilo sobre toda informação confidencial recebida.</p>
        <p style="text-align: justify; margin-bottom: 15pt; text-indent: 30pt;">Parágrafo 19. A obrigação permanecerá válida por [5] anos após o término do contrato.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 10 — PROPRIEDADE INTELECTUAL</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Titularidade dos entregáveis vinculada à quitação integral.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 11 — DADOS PESSOAIS (LGPD)</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Conformidade total com a Lei Geral de Proteção de Dados.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 12 — SUBCONTRATAÇÃO</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Necessidade de anuência prévia para subcontratar terceiros.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 13 — NÃO ALICIAMENTO</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Proibição de contratação de colaboradores da outra parte.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 14 — RESPONSABILIDADE</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Limites contratuais para indenização e perdas e danos.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 15 — RESCISÃO</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Hipóteses de distrato e denúncia imotivada.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 16 — CLÁUSULA PENAL</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Multas por descumprimento de obrigações específicas.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 17 — COMUNICAÇÕES</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Endereços oficiais para notificações contratuais.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 18 — DISPOSIÇÕES GERAIS</h2>
        <p style="text-align: justify; margin-bottom: 15pt;">Validade jurídica e sucessão contratual.</p>

        <h2 style="font-size: 12pt; font-weight: bold; margin-top: 20pt; text-transform: uppercase;">CLÁUSULA 19 — FORO</h2>
        <p style="text-align: justify; margin-bottom: 30pt;">Fica eleito o foro da Comarca de [cidade/UF].</p>

        <div style="margin-top: 40pt; text-align: left;">
          <p>[Local], [data].</p>
          <div style="display: flex; gap: 50pt; margin-top: 30pt;">
            <div>_______________________<br><b>CONTRATANTE</b></div>
          </div>
        </div>
      </div>
    `
  }
];

export function TemplatesTab() {
  const [search, setSearch] = useState('');
  const [instantiating, setInstantiating] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filtered = TEMPLATE_DB.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleInstantiate = async (template: Template) => {
    setInstantiating(template.id);
    try {
      // Simula download payload
      await new Promise(res => setTimeout(res, 800));
      await insertTemplateToDocument(template.htmlBase);
      setSuccess(template.id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      if (instantiating === template.id) setInstantiating(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* Busca */}
      <div className="p-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <label className="text-2xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
          Busca de Modelos (2.500+)
        </label>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Ex: Acordo de quotistas"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-shadow"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="p-3 space-y-3 pb-24">
        {filtered.map(t => (
          <div key={t.id} className="bg-white border text-left border-slate-200 rounded-lg p-3 hover:border-brand-300 transition-colors shadow-sm animate-slide-up">
            <div className="flex justify-between items-start mb-1">
              <span className="text-2xs font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100 uppercase">
                {t.category}
              </span>
              <BookTemplate className="w-4 h-4 text-slate-300" />
            </div>
            
            <h3 className="text-xs font-bold text-slate-800 leading-tight mb-1.5">
              {t.title}
            </h3>
            <p className="text-2xs text-slate-500 leading-relaxed mb-3 line-clamp-2">
              {t.description}
            </p>

            <button 
              onClick={() => handleInstantiate(t)}
              disabled={instantiating === t.id}
              className={`w-full py-1.5 rounded flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${
                success === t.id 
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700'
              }`}
            >
              {instantiating === t.id ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Baixando...</>
              ) : success === t.id ? (
                <><CheckCircle2 className="w-3.5 h-3.5"/> Injetado com sucesso!</>
              ) : (
                <><Download className="w-3.5 h-3.5"/> Instanciar no Word</>
              )}
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center p-8 text-slate-400">
            <Search className="w-8 h-8 opacity-50 mx-auto mb-2" />
            <p className="text-xs font-medium">Nenhum modelo encontrado.</p>
          </div>
        )}
      </div>

    </div>
  );
}
