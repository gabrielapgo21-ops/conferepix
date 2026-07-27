/**
 * Banco de artigos da Central de Ajuda.
 *
 * Cada artigo tem:
 *  - id (slug)
 *  - categoria (Começando | Produtos | Vendas | Clientes | Estoque | Relatórios | Marketing | Configurações)
 *  - titulo (pergunta tipo "Como faço X?")
 *  - resumo (1 frase pra ajudar na busca)
 *  - conteudo (texto em markdown leve — usa \n)
 *  - videoUrl (opcional — vídeo do YouTube embedável; você cola depois)
 *  - tempo (estimativa em minutos pra ler)
 */

export type CategoriaAjuda =
  | "Começando"
  | "Produtos"
  | "Vendas"
  | "Clientes"
  | "Estoque"
  | "Relatórios"
  | "Marketing"
  | "Configurações";

export interface Artigo {
  id: string;
  categoria: CategoriaAjuda;
  emoji: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  videoUrl?: string;
  tempo: number; // minutos
}

export const CATEGORIA_EMOJI: Record<CategoriaAjuda, string> = {
  "Começando": "🚀",
  "Produtos": "📦",
  "Vendas": "🛒",
  "Clientes": "👥",
  "Estoque": "📊",
  "Relatórios": "📈",
  "Marketing": "✨",
  "Configurações": "⚙️",
};

export const ARTIGOS: Artigo[] = [
  // ===================== COMEÇANDO =====================
  {
    id: "primeiros-passos",
    categoria: "Começando",
    emoji: "👋",
    titulo: "Primeiros passos no ConferePix",
    resumo: "Tour rápido pelo app pra você começar a usar agora.",
    tempo: 3,
    conteudo: `Bem-vinda ao ConferePix! Aqui tá um guia rapidão pra você começar:

**1. Cadastrar a loja**
Vai em Configurações e preenche o nome da sua loja. Esse nome aparece nas mensagens da Pix e nos relatórios.

**2. Cadastrar seus produtos**
No menu "Produtos Cadastrados", clica em "+ Cadastrar produto". Você pode tirar foto, colocar preço, código de barras e tudo mais. Quanto mais completo, melhor os relatórios.

**3. Fazer a primeira venda**
Vai em "Vendas", busca um produto ou monta avulso, escolhe a forma de pagamento e registra. Em segundos.

**4. Conhecer a Pix (IA)**
No canto da tela tem um botão azul brilhante. Clica e fala com a Pix — ela conhece seus dados e responde tudo.

Pronto, em menos de 5 minutos você tá usando! 💚`,
  },
  {
    id: "como-instalar-app",
    categoria: "Começando",
    emoji: "📱",
    titulo: "Como instalar o app no celular",
    resumo: "Pra abrir igual app de verdade, sem precisar do navegador.",
    tempo: 2,
    conteudo: `Você não precisa baixar nada na loja de apps! O ConferePix é um PWA (web app instalável).

**No iPhone (Safari):**
1. Abre o app no Safari
2. Toca no botão de compartilhar (quadradinho com seta pra cima)
3. Rola e toca em "Adicionar à Tela de Início"
4. Confirma o nome e toca em "Adicionar"

**No Android (Chrome):**
1. Abre o app no Chrome
2. Toca nos três pontinhos do canto
3. Toca em "Instalar app" ou "Adicionar à tela inicial"

Pronto! Agora aparece igual um app normal. Abre rápido e funciona offline. 🚀`,
  },

  // ===================== PRODUTOS =====================
  {
    id: "cadastrar-produto",
    categoria: "Produtos",
    emoji: "📦",
    titulo: "Como cadastrar um produto",
    resumo: "Passo a passo pra cadastrar produtos com foto e tudo.",
    tempo: 3,
    conteudo: `**1.** No menu, vai em **Produtos Cadastrados**
**2.** Clica em **"+ Cadastrar produto"**
**3.** Preenche os campos:
  - **Nome**: obrigatório (ex: "Bota cano longo")
  - **Foto**: tira foto ou pega da galeria. A Pix reconhece o produto e sugere os dados!
  - **Categoria**: escolhe (Calçados, Roupas, Bijuterias...)
  - **Preço de venda**: quanto você cobra
  - **Custo de compra**: quanto te custou (importante pro cálculo de lucro)
  - **Código de barras**: bipa direto se tiver. Ajuda a venda rápida.
  - **Estoque**: marca se tem bastante / acabando / acabou
**4.** Salva.

**Dica:** preenche o custo! Sem ele, o app não consegue calcular seu lucro de verdade.`,
  },
  {
    id: "ia-reconhece-foto",
    categoria: "Produtos",
    emoji: "🤖",
    titulo: "Como a IA reconhece a foto do produto",
    resumo: "Tira foto e a IA preenche nome, cor, categoria sozinha.",
    tempo: 2,
    conteudo: `Quando você tira foto no cadastro, a Pix analisa a imagem e sugere:

- **Nome** (ex: "Bota cano longo")
- **Categoria** (Calçados, Roupas...)
- **Cor principal**
- **Modelo/Estilo**
- **Descrição**

Você pode aceitar a sugestão ou ajustar antes de salvar. Funciona melhor com:
- ✅ Foto com fundo neutro (parede branca, mesa)
- ✅ Produto centralizado e visível
- ✅ Boa iluminação

Evita:
- ❌ Fotos escuras ou desfocadas
- ❌ Vários produtos na mesma foto
- ❌ Foto da etiqueta (a IA acaba lendo a marca em vez do produto)`,
  },
  {
    id: "bipar-codigo-barras",
    categoria: "Produtos",
    emoji: "📷",
    titulo: "Como bipar código de barras",
    resumo: "Use a câmera do celular pra bipar igual maquininha.",
    tempo: 2,
    conteudo: `O scanner do ConferePix funciona com a câmera do celular — sem precisar de leitor.

**Pra cadastrar produto com código:**
1. No cadastro, clica em **"Bipar código"**
2. Aponta a câmera pro código de barras
3. Espera o bip — o código vai pro campo automaticamente

**Pra vender produto cadastrado:**
1. Em "Vendas", clica em **"Bipar código"** no topo
2. Aponta pro código
3. O produto vai DIRETO pro carrinho ✅

**Funciona com:** EAN-13, EAN-8, UPC, Code 128, QR Code.

**Dica:** se não estiver lendo, segura o celular firme, com boa luz, a uns 15cm do código.`,
  },
  {
    id: "produto-temporario",
    categoria: "Produtos",
    emoji: "⏱️",
    titulo: "O que é um produto temporário?",
    resumo: "Quando você vende algo sem ter cadastrado ainda.",
    tempo: 2,
    conteudo: `Tem hora que você precisa vender RÁPIDO e o produto não tá cadastrado. O ConferePix permite:

**Vendas → busca → digita nome → "Adicionar como item avulso"** → coloca o preço → vende.

Esse produto entra como "temporário" e fica marcado no app pra você completar o cadastro depois (com calma).

Você acha esses produtos na tela **Produtos Cadastrados** filtrando por "Temporários" — daí completa quando puder.

**Importante:** produtos temporários não entram nos cálculos de margem/lucro nem no controle de estoque. Por isso é bom completar quando der tempo.`,
  },

  // ===================== VENDAS =====================
  {
    id: "fazer-venda",
    categoria: "Vendas",
    emoji: "🛒",
    titulo: "Como fazer uma venda no balcão",
    resumo: "Do carrinho à confirmação em segundos.",
    tempo: 3,
    conteudo: `**1.** Vai em **Vendas** (ou na aba "Vender" no celular)
**2.** Adiciona produtos:
   - Busca por nome/código no topo
   - Ou clica nos botões grandes dos "Mais vendidos"
   - Ou bipa o código de barras
**3.** Ajusta quantidades com os botões + e − no carrinho
**4.** Aplica desconto (R$ ou %) se rolar
**5.** Vincula a uma cliente (opcional — bom pra fidelidade)
**6.** Escolhe pagamento: Pix / Dinheiro / Cartão
   - **Dinheiro**: digita quanto a cliente deu, o app calcula o troco
   - **Cartão**: escolhe maquininha, débito/crédito/parcelado
   - **Misto**: parte em uma forma, parte em outra
**7.** Clica em **"Registrar venda"**

Aparece um modal verde linda confirmando, e se tiver cliente vinculada, dá pra mandar agradecimento no WhatsApp.`,
  },
  {
    id: "pagamento-misto",
    categoria: "Vendas",
    emoji: "💳",
    titulo: "Como receber em duas formas de pagamento",
    resumo: "Cliente paga metade no Pix, metade no cartão? Resolve fácil.",
    tempo: 2,
    conteudo: `Acontece toda hora: cliente paga uma parte de um jeito e outra parte de outro. Em "Vendas":

1. Monta o carrinho normalmente
2. Embaixo das formas de pagamento, clica em **"+ Pagou em duas formas"**
3. Escolhe a 2ª forma e o valor que vai por ela
4. O app calcula sozinho quanto fica na 1ª forma

Exemplo:
- Total: R$ 150
- 1ª forma: Pix (R$ 100)
- 2ª forma: Dinheiro (R$ 50)

Aparece como 2 transações na conferência, mas conta como UMA venda.`,
  },
  {
    id: "calcular-troco",
    categoria: "Vendas",
    emoji: "💰",
    titulo: "O troco é calculado automaticamente",
    resumo: "Não precisa fazer conta — basta digitar quanto te deram.",
    tempo: 1,
    conteudo: `Quando você escolhe **Dinheiro** como pagamento, aparece o campo **"Quanto a cliente deu?"**.

Digita o valor e o app mostra o troco em verde grande:

> 💰 Troco: R$ 12,50

Se a pessoa deu menos do que devia, aparece em amarelo: "Faltam R$ 5,00".

Funciona offline e em qualquer celular. Adeus calculadora! 🎉`,
  },
  {
    id: "desfazer-venda",
    categoria: "Vendas",
    emoji: "↩️",
    titulo: "Como apagar uma venda errada",
    resumo: "Bateu errado? Apaga em 2 toques.",
    tempo: 1,
    conteudo: `**1.** Vai em **Conferência**
**2.** Encontra a transação errada
**3.** Clica no botão de lixeira (canto da linha)
**4.** Confirma

A venda some do app inteiro: relatório, dashboard, contador. Tudo recalcula.

Se você vinculou a uma cliente, o histórico dela também é atualizado.`,
  },

  // ===================== CLIENTES =====================
  {
    id: "cadastrar-cliente",
    categoria: "Clientes",
    emoji: "👤",
    titulo: "Como cadastrar um cliente",
    resumo: "WhatsApp + aniversário e a Pix cuida do resto.",
    tempo: 2,
    conteudo: `**1.** Vai em **Clientes** (menu lateral)
**2.** Clica em **"+ Cadastrar cliente"**
**3.** Preenche:
  - **Nome** (obrigatório)
  - **WhatsApp** com DDD — pra mandar mensagens depois
  - **Aniversário** (calendário) — pra felicitar
  - **Email** (opcional)
  - **Observações** (ex: "prefere preto, tem cachorro")
**4.** Salva.

Pronto! O cliente aparece na lista e o app começa a acompanhar.`,
  },
  {
    id: "mensagens-prontas",
    categoria: "Clientes",
    emoji: "💬",
    titulo: "Mensagens prontas pra WhatsApp",
    resumo: "Mensagens pré-prontas pra cada situação.",
    tempo: 2,
    conteudo: `Em **Clientes**, clica no botão verde "WhatsApp" no card de qualquer cliente. Abre modal com 7 mensagens prontas:

- 👋 **Boas-vindas** — pra novos clientes
- 💚 **Obrigada pela compra** — agradecimento
- ✨ **Cliente sumida** — pra quem não vem há tempo
- 🎉 **Feliz aniversário**
- 🎁 **Cupom de desconto**
- 🛍️ **Novidades chegaram**
- 📣 **Lembrete de evento**

A IA escolhe sozinha as **sugestões certas** pra cada cliente — ex: se for aniversariante hoje, ela sugere "Feliz aniversário" no topo.

Você pode editar antes de mandar. Quando clica em "Mandar", abre o WhatsApp com a mensagem pronta.`,
  },
  {
    id: "cliente-sumido",
    categoria: "Clientes",
    emoji: "✨",
    titulo: "O que é \"cliente sumido\"?",
    resumo: "É quem não compra com você há 30+ dias.",
    tempo: 2,
    conteudo: `O ConferePix marca como **"Sumido"** todo cliente que:
- Já comprou pelo menos 1 vez
- Não fez nova compra nos últimos **30 dias**

Aparece no dashboard ("X clientes sumidos") e no filtro **Sumidos** da tela Clientes.

**O que fazer com eles:**
1. Vai em Clientes
2. Filtra por "Sumidos"
3. Pra cada um, clica em WhatsApp
4. A Pix sugere "Volta sumida" ou "Cupom de desconto"
5. Manda → reativa cliente que tava esquecida!

Trazer cliente sumida custa MUITO menos que conseguir cliente nova. 💚`,
  },
  {
    id: "aniversario-cliente",
    categoria: "Clientes",
    emoji: "🎂",
    titulo: "Como saber dos aniversários",
    resumo: "Felicita na hora certa e fideliza.",
    tempo: 1,
    conteudo: `Se você cadastrou o aniversário do cliente, o ConferePix mostra:

**No dashboard:** card rosa "X faz aniversário hoje!"
**Em Clientes:** filtro "Aniversariantes" mostra do mês todo
**Na lista:** cada card mostra o dia/mês de aniversário

Quando alguém faz aniversário hoje, é só clicar no WhatsApp e a Pix já sugere a mensagem de parabéns. Manda um cupom junto pra fidelizar de vez 🎁`,
  },

  // ===================== ESTOQUE =====================
  {
    id: "controle-estoque",
    categoria: "Estoque",
    emoji: "📊",
    titulo: "Como o estoque funciona",
    resumo: "Cadastra quantidade, vende, repõe — fácil.",
    tempo: 3,
    conteudo: `**Cadastrar estoque inicial:**
No cadastro do produto, em "Quantidade aprox.", coloca quantos você tem. O app monitora a partir daí.

**Quando você vende:** o estoque cai sozinho.

**Quando você compra do fornecedor:** vai em **Repor Estoque** → marca "Comprei X unidades" → o estoque sobe.

**Status visual:**
- 🟢 **Bastante** — tranquilo
- 🟡 **Acabando** — cuidado
- 🔴 **Acabou** — precisa repor

A Pix também faz cálculo inteligente:
> "Esse produto vende 2x/dia. Você tem 5. Acaba em ~2.5 dias."

E te avisa quando tá ficando crítico.`,
  },
  {
    id: "lista-compras-fornecedor",
    categoria: "Estoque",
    emoji: "🛒",
    titulo: "Lista de compras pro fornecedor",
    resumo: "App monta a lista e você manda no WhatsApp.",
    tempo: 2,
    conteudo: `Na tela **Repor Estoque**, o app mostra TUDO que tá precisando comprar, ordenado por urgência:

🔴 **Crítico** — acaba em 3 dias
🟠 **Alto** — acaba em 7 dias
🟡 **Médio** — acaba em 14 dias

Pra cada produto:
- Quantos você tem agora
- Quanto vende por dia
- Quanto sugiro comprar (pra durar +30 dias)

**Como mandar pro fornecedor:**
1. Clica em **"Copiar lista"** (vai pra área de transferência)
2. Ou clica em **"Enviar no WhatsApp"** — abre o WhatsApp com a lista pronta!

Quando o fornecedor entregar, volta no app e clica em "Comprei essa quantidade" — atualiza tudo sozinho.`,
  },
  {
    id: "produto-parado",
    categoria: "Estoque",
    emoji: "💤",
    titulo: "O que fazer com produto parado?",
    resumo: "Quando algo não vende há muito tempo.",
    tempo: 2,
    conteudo: `Produto parado é o que **não vende há 30+ dias**. O ConferePix aponta esses casos no Dashboard e em Relatórios.

**Estratégias:**
1. **Foto melhor** — às vezes só falta uma foto bonita
2. **Reposicionar** — coloca em destaque ou perto do caixa
3. **Combo** — junta com produto que vende bem ("Bota + meia por R$ X")
4. **Liquidação** — desconto agressivo. Melhor ter R$ no caixa do que parado na prateleira
5. **Brinde** — dá com compras acima de X reais

**Use a Pix:**
Vai em Marketing IA → escolhe o produto parado → "3 ideias de promoção". Ela dá ideias específicas pra esse produto. 🎁`,
  },

  // ===================== RELATÓRIOS =====================
  {
    id: "entender-dashboard",
    categoria: "Relatórios",
    emoji: "📊",
    titulo: "Como ler o Dashboard",
    resumo: "Cada bloco do início explicado.",
    tempo: 3,
    conteudo: `**1. Insights da Pix** (topo)
3 observações geradas pela IA sobre o seu negócio agora. Toca pra ir direto pra ação.

**2. Stats principais**
Total vendido, recebido, taxas, em risco — números do mês.

**3. Bloco Produtos**
Quantos cadastrados, mais vendidos, acabando, temporários.

**4. Alerta de reposição** (amarelo)
Aparece SÓ quando tem produto crítico/alto pra repor.

**5. Visão geral do mês**
- Vendido + variação vs mês passado
- Lucro estimado + margem
- Gráfico de vendas dos últimos 30 dias
- Melhor dia da semana
- Top 5 mais vendidos
- Produtos parados

**6. Bloco Clientes** (se você tem clientes cadastrados)
Aniversariantes, sumidos, cliente top.

Tudo atualizado em tempo real.`,
  },
  {
    id: "exportar-excel",
    categoria: "Relatórios",
    emoji: "📄",
    titulo: "Como exportar pra Excel/Sheets",
    resumo: "Baixa CSV de transações ou produtos.",
    tempo: 1,
    conteudo: `**1.** Vai em **Relatório**
**2.** No card "Exportar pra Excel / planilha", clica em:
- **Transações** — baixa CSV com todas as vendas
- **Produtos** — baixa CSV com todo o catálogo
**3.** Abre o arquivo no Excel, Google Sheets ou Numbers — funciona em todos.

O arquivo já vem formatado em PT-BR (vírgula decimal, datas DD/MM/AAAA, encoding UTF-8 pra acentos funcionarem).`,
  },
  {
    id: "lucro-estimado",
    categoria: "Relatórios",
    emoji: "💵",
    titulo: "Como o lucro é calculado?",
    resumo: "Preço de venda − custo dos produtos vendidos.",
    tempo: 2,
    conteudo: `O lucro do mês é calculado assim:

**Lucro = (preço × quantidade vendida) − (custo × quantidade vendida)**

Pra cada produto que vendeu no mês, ele:
1. Soma o faturamento (preço × qtd)
2. Soma o custo (custo × qtd)
3. Subtrai

**Margem = lucro ÷ faturamento × 100**

**Por isso é importante preencher o custo dos produtos!** Sem custo, o app não consegue calcular. Quando você vê "—" no lucro, é porque faltam dados de custo.

**Dica:** vai em Marketing IA → "Preço sugerido" pra ver se você tá precificando bem.`,
  },

  // ===================== MARKETING =====================
  {
    id: "ia-marketing",
    categoria: "Marketing",
    emoji: "✨",
    titulo: "Como usar o Marketing IA",
    resumo: "Geração automática de post, descrição, hashtags.",
    tempo: 2,
    conteudo: `Vai em **Marketing IA** no menu:

**Passo 1:** Escolhe o produto (busca ou clica num dos mais vendidos)

**Passo 2:** Escolhe o que quer gerar:
- 📱 **Post Instagram** — pronto pra Insta/Face
- 🛒 **Descrição marketplace** — pra Shopee/ML
- 💬 **Status WhatsApp** — mensagem curta
- #️⃣ **15 hashtags** — mistura de alcance e nicho
- 💰 **Preço sugerido** — análise + margem
- 🎁 **3 ideias de promoção** — combos, descontos

**Passo 3:** A IA gera em segundos. Você pode editar o texto.

**Passo 4:** Botão **"Copiar"** pra colar onde quiser, ou **"WhatsApp"** pra mandar direto.

Tudo grátis. Tudo em PT-BR. 🚀`,
  },
  {
    id: "como-falar-com-pix",
    categoria: "Marketing",
    emoji: "💬",
    titulo: "Como usar a Pix (assistente IA)",
    resumo: "O botão azul brilhante no canto.",
    tempo: 2,
    conteudo: `A **Pix** é sua assistente IA. Ela conhece TUDO do seu negócio.

**Onde fica:** botão azul brilhante no canto inferior direito (em qualquer tela).

**Pergunta o que quiser:**
- "Como tá meu mês?"
- "O que vendi mais?"
- "Quem tá sumido?"
- "Dá uma dica de promoção"
- "Qual produto tá parado?"
- "Quanto faturei essa semana?"
- "Vale a pena fazer queima de estoque?"

Ela responde curto e direto. Tem histórico salvo (não perde a conversa).

**Importante:** ela usa dados ATUAIS — então toda hora que você cadastra um produto ou faz uma venda, ela "aprende" automaticamente.`,
  },

  // ===================== CONFIGURAÇÕES =====================
  {
    id: "criar-conta",
    categoria: "Configurações",
    emoji: "🔐",
    titulo: "Como criar conta e sincronizar entre dispositivos",
    resumo: "Mesmos dados no celular e no computador.",
    tempo: 2,
    conteudo: `**1.** Clica em **Cadastro** na tela inicial
**2.** Coloca email e senha
**3.** Confirma o email
**4.** Pronto! Os dados sincronizam automaticamente entre todos os dispositivos onde você logar.

Tudo é criptografado e privado — ninguém vê seus dados além de você.

Funciona em iPhone, Android, Mac, PC, tablet — só precisa entrar com email + senha.

**Esqueceu a senha?** Tem botão "Esqueci a senha" na tela de login.`,
  },
  {
    id: "resetar-app",
    categoria: "Configurações",
    emoji: "🗑️",
    titulo: "Como apagar tudo e começar do zero",
    resumo: "Vai em Configurações → Resetar app.",
    tempo: 1,
    conteudo: `Se você quer apagar tudo (produtos, vendas, clientes) e recomeçar:

**1.** Vai em **Configurações** no menu
**2.** Rola até o fim
**3.** Clica em **"Resetar app"**
**4.** Confirma — apaga TUDO local e na nuvem

⚠️ **Importante:** essa ação é irreversível. Os dados não voltam. Faz só se tiver certeza absoluta.

**Antes de resetar**, exporta seus dados em Relatório → Excel pra ter backup.`,
  },
];

// Helpers
export function buscarArtigos(termo: string): Artigo[] {
  const q = termo.trim().toLowerCase();
  if (!q) return ARTIGOS;
  return ARTIGOS.filter(
    (a) =>
      a.titulo.toLowerCase().includes(q) ||
      a.resumo.toLowerCase().includes(q) ||
      a.conteudo.toLowerCase().includes(q) ||
      a.categoria.toLowerCase().includes(q)
  );
}

export function artigosPorCategoria(): Record<CategoriaAjuda, Artigo[]> {
  const result = {} as Record<CategoriaAjuda, Artigo[]>;
  for (const a of ARTIGOS) {
    if (!result[a.categoria]) result[a.categoria] = [];
    result[a.categoria].push(a);
  }
  return result;
}
