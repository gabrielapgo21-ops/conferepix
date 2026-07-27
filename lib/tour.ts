/**
 * Sistema de tour e dicas contextuais.
 *
 * "Tour" é um onboarding sequencial que aparece da PRIMEIRA vez
 * que a pessoa entra no app.
 *
 * "Dica contextual" é uma observação que aparece quando ela
 * visita uma tela específica pela primeira vez.
 */

const STORAGE_KEY = "conferepix-tour-state";

interface TourState {
  tourCompleto: boolean;
  dicasVistas: string[];
  tourPulado: boolean;
}

const defaultState: TourState = {
  tourCompleto: false,
  dicasVistas: [],
  tourPulado: false,
};

function load(): TourState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<TourState>;
    return {
      tourCompleto: !!parsed.tourCompleto,
      tourPulado: !!parsed.tourPulado,
      dicasVistas: Array.isArray(parsed.dicasVistas) ? parsed.dicasVistas : [],
    };
  } catch {
    return defaultState;
  }
}

function save(s: TourState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignora quota cheia
  }
}

export function deveMostrarTour(): boolean {
  const s = load();
  return !s.tourCompleto && !s.tourPulado;
}

export function marcarTourCompleto() {
  save({ ...load(), tourCompleto: true });
}

export function pularTour() {
  save({ ...load(), tourPulado: true });
}

export function resetarTour() {
  save(defaultState);
}

export function dicaJaVista(id: string): boolean {
  return load().dicasVistas.includes(id);
}

export function marcarDicaVista(id: string) {
  const s = load();
  if (s.dicasVistas.includes(id)) return;
  save({ ...s, dicasVistas: [...s.dicasVistas, id] });
}

// ============================================================================
// PASSOS DO TOUR
// ============================================================================

export interface TourPasso {
  titulo: string;
  texto: string;
  emoji: string;
  rota?: string; // se preenchido, navega pra essa rota antes do passo
}

export const TOUR_PASSOS: TourPasso[] = [
  {
    titulo: "Bem-vinda ao ConferePix! 💚",
    emoji: "👋",
    texto:
      "Eu sou a Pix, sua assistente. Vou te mostrar rapidinho como o app funciona — leva menos de 1 minuto.",
  },
  {
    titulo: "Esse é o Dashboard",
    emoji: "🏠",
    texto:
      "É a sua tela inicial. Mostra um resumo do que tá acontecendo agora: faturamento do mês, mais vendidos, clientes, estoque, tudo.",
    rota: "/",
  },
  {
    titulo: "Insights inteligentes",
    emoji: "✨",
    texto:
      "Aqui no topo, eu gero 3 observações sobre seu negócio. Toca pra ir direto pra ação.",
  },
  {
    titulo: "Cadastra seus produtos",
    emoji: "📦",
    texto:
      "Vai em 'Produtos Cadastrados' e adiciona tudo que você vende. Pode tirar foto e eu reconheço o produto!",
  },
  {
    titulo: "Vendas em 10 segundos",
    emoji: "🛒",
    texto:
      "Em 'Vendas', monta o carrinho, escolhe Pix/Dinheiro/Cartão e pronto. Eu calculo o troco e tudo.",
  },
  {
    titulo: "Eu cuido do estoque",
    emoji: "📊",
    texto:
      "Em 'Repor Estoque' eu já te mostro o que tá acabando e quantas comprar — com lista pronta pra mandar pro fornecedor no WhatsApp.",
  },
  {
    titulo: "Conversa comigo!",
    emoji: "💬",
    texto:
      "Sempre que precisar, clica no botão azul brilhante no canto da tela. Eu respondo em segundos e conheço todos os seus dados.",
  },
  {
    titulo: "Pronta pra começar? 🚀",
    emoji: "💚",
    texto:
      "Qualquer dúvida, vai na 'Central de Ajuda' (lá no menu) ou me chama no chat. Bora vender!",
  },
];
