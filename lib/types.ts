export type PaymentMethod =
  | "pix"
  | "debito"
  | "credito_avista"
  | "credito_parcelado"
  | "dinheiro";

export type TransactionStatus =
  | "ok"
  | "aguardando_repasse"
  | "repasse_confirmado"
  | "falta_receber"
  | "taxa_divergente"
  | "valor_divergente"
  | "nao_identificado"
  | "cancelada";

export type FileStatus =
  | "aguardando"
  | "processando"
  | "processado"
  | "erro";

export type FileKind = "extrato_bancario" | "relatorio_maquininha" | "planilha_vendas";

export type Maquininha =
  | "Ton"
  | "Stone"
  | "Mercado Pago"
  | "Cielo"
  | "Rede"
  | "PagSeguro"
  | "PagBank"
  | "Sicoob"
  | "Sicredi"
  | "SafraPay"
  | "Sumup"
  | "InfinitePay"
  | "Getnet"
  | "BB Pay"
  | "Caixa Pay"
  | "Bin"
  | "Outro";

export type TransactionSource =
  | "venda_manual"
  | "maquininha"
  | "upload_extrato"
  | "pix_manual";

export type IntegrationStatus = "manual" | "simulada" | "conectada";

export type SaleStatus = "aprovada" | "pendente" | "cancelada";

export interface Transaction {
  id: string;
  data: string; // ISO date
  metodo: PaymentMethod;
  descricao: string;
  valorVendido: number;
  valorEsperado: number;
  valorRecebido: number; // 0 quando ainda não recebeu
  taxaEsperada: number; // % esperado
  taxaCobrada: number; // % efetivamente cobrado
  status: TransactionStatus;
  parcelas?: number;
  diasParaReceber?: number;
  origem: TransactionSource;
  maquininhaId?: string;
  dataRepassePrevisto?: string; // ISO date
  // Cliente vinculado (opcional — não trava o fluxo de venda)
  clienteId?: string;
  clienteNome?: string; // snapshot
}

export interface UploadedFile {
  id: string;
  nome: string;
  tipo: FileKind;
  status: FileStatus;
  tamanho: number; // bytes
  dataUpload: string;
  linhasProcessadas?: number;
  erros?: string[];
}

export interface RateConfig {
  maquininha: Maquininha;
  taxaPix: number; // %
  taxaDebito: number;
  taxaCreditoAvista: number;
  taxaCreditoParcelado: number;
  prazoDebito: number; // dias
  prazoCredito: number; // dias
}

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  ok: "OK",
  aguardando_repasse: "Aguardando repasse",
  repasse_confirmado: "Repasse confirmado",
  falta_receber: "Falta receber",
  taxa_divergente: "Taxa divergente",
  valor_divergente: "Valor divergente",
  nao_identificado: "Não identificado",
  cancelada: "Cancelada",
};

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  debito: "Débito",
  credito_avista: "Crédito à vista",
  credito_parcelado: "Crédito parcelado",
  dinheiro: "Dinheiro",
};

export const SOURCE_LABELS: Record<TransactionSource, string> = {
  venda_manual: "Venda manual",
  maquininha: "Maquininha",
  upload_extrato: "Upload de extrato",
  pix_manual: "Pix informado manualmente",
};

// ===== Recebimentos ao Vivo =====

export type ConnectionStatus = "conectada" | "desconectada" | "erro";

/**
 * Máquina cadastrada — versão rica.
 * Cada maquininha tem suas próprias taxas e prazos (porque cada adquirente cobra diferente).
 */
export interface ConnectedMachine {
  id: string;
  apelido: string; // ex: "MP do caixa"
  marca: Maquininha;
  numeroSerie?: string;
  contaDestino?: string; // onde o dinheiro cai (ex: "Itaú ag 1234 c/c 56789-0")

  // Taxas próprias da maquininha
  taxaPix?: number;
  taxaDebito: number;
  taxaCreditoAvista: number;
  taxaCreditoParcelado: number;
  prazoDebito: number; // dias úteis
  prazoCredito: number; // dias úteis

  // Status
  status: ConnectionStatus;
  integrationStatus: IntegrationStatus;

  // Credenciais futuras (mockadas no MVP)
  apiKey?: string;
  webhookUrl?: string;
  apiToken?: string;

  // Métricas
  ultimaSincronizacao: string; // ISO
  totalHoje: number;
  transacoesHoje: number;
}

export interface LiveTransaction {
  id: string;
  data: string; // ISO datetime
  metodo: PaymentMethod;
  valor: number;
  taxa: number; // % cobrada
  valorLiquido: number; // valor - taxa
  bandeira?: string;
  parcelas?: number;
  nsu?: string;
  maquininhaId: string;
  pagador?: string;
  status: "aprovada" | "pendente" | "estornada";
}

export const BANDEIRAS_CREDITO = ["Visa", "Master", "Elo", "Amex", "Hipercard"] as const;
export const BANCOS_PIX = [
  "Banco do Brasil",
  "Caixa",
  "Itaú",
  "Bradesco",
  "Santander",
  "Nubank",
  "Inter",
  "C6 Bank",
  "Mercado Pago",
  "PicPay",
] as const;

// ===== Dados da loja =====
export interface StoreSettings {
  nomeLoja: string;
  cnpj?: string;
  telefone?: string;
  moeda: "BRL";
  email?: string;
  endereco?: string;
  // ===== Configuração do Catálogo Site (opcional) =====
  catalogo?: {
    slug?: string; // ex: "chapelariagarcia" → /api/catalogo/chapelariagarcia.js
    fotosBaseUrl?: string; // URL base das fotos (deixar vazio pra caminho relativo tipo "fotos/M-01.webp")
    ativo?: boolean; // se true, endpoint serve o JSON
    variavelJs?: string; // nome da var global (default: "BOOTS")
  };
}

export const DEFAULT_STORE: StoreSettings = {
  nomeLoja: "Minha lojinha",
  moeda: "BRL",
};

export const NOMES_PAGADORES = [
  "Maria Silva",
  "João Oliveira",
  "Ana Souza",
  "Bárbara Lima",
  "Letícia Costa",
  "Carla Mendes",
  "Patrícia Rocha",
  "Juliana Alves",
  "Fernanda Reis",
  "Camila Dias",
  "Renata Castro",
  "Marina Pinto",
  "Beatriz Nunes",
  "Gabriela Tavares",
  "Cliente balcão",
] as const;
