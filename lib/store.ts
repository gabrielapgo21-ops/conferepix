"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Transaction,
  UploadedFile,
  RateConfig,
  LiveTransaction,
  ConnectedMachine,
  StoreSettings,
} from "./types";
import { DEFAULT_STORE } from "./types";
import { DEFAULT_RATES, MOCK_FILES, generateMockTransactions } from "./mockData";
import {
  DEFAULT_MACHINES,
  generateInitialLiveFeed,
  generateLiveTransaction,
} from "./liveEngine";
import { DEFAULT_PRODUCTS, enrichWithSales, type Product } from "./products";
import type { Customer } from "./customers";

interface AppState {
  rates: RateConfig;
  setRates: (rates: RateConfig) => void;

  transactions: Transaction[];
  regenerateTransactions: () => void;
  addSale: (sale: Transaction) => void;
  removeTransaction: (id: string) => void;
  removeManyTransactions: (ids: string[]) => void;
  clearAllTransactions: () => void;

  files: UploadedFile[];
  addFile: (file: UploadedFile) => void;
  updateFile: (id: string, patch: Partial<UploadedFile>) => void;
  removeFile: (id: string) => void;

  // ===== Recebimentos ao Vivo =====
  machines: ConnectedMachine[];
  addMachine: (m: ConnectedMachine) => void;
  updateMachine: (id: string, patch: Partial<ConnectedMachine>) => void;
  removeMachine: (id: string) => void;

  liveFeed: LiveTransaction[];
  pushLive: () => LiveTransaction | null;
  clearLiveFeed: () => void;
  initLiveFeed: () => void;
  mergeServerFeed: (server: LiveTransaction[]) => void;

  // ===== Loja =====
  store: StoreSettings;
  setStore: (patch: Partial<StoreSettings>) => void;

  // ===== Produtos =====
  products: Product[];
  addProduct: (p: Product) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  updateManyProducts: (ids: string[], patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  removeManyProducts: (ids: string[]) => void;
  resetProducts: () => void;

  // ===== Entradas de estoque (compras de fornecedor) =====
  stockEntries: StockEntry[];
  addStockEntry: (e: StockEntry) => void;
  removeStockEntry: (id: string) => void;

  // ===== Clientes (CRM) =====
  customers: Customer[];
  addCustomer: (c: Customer) => void;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  removeCustomer: (id: string) => void;
}

export interface StockEntry {
  id: string;
  data: string; // ISO
  produtoId: string;
  produtoNome: string; // snapshot pro caso do produto sumir
  quantidade: number;
  custoUnitario?: number;
  fornecedor?: string;
  observacoes?: string;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      rates: DEFAULT_RATES,
      setRates: (rates) => {
        set({ rates });
        set({ transactions: generateMockTransactions(rates) });
      },

      transactions: generateMockTransactions(DEFAULT_RATES),
      regenerateTransactions: () =>
        set({ transactions: generateMockTransactions(get().rates) }),
      addSale: (sale) =>
        set((s) => ({ transactions: [sale, ...s.transactions] })),
      removeTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
      removeManyTransactions: (ids) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => !ids.includes(t.id)),
        })),
      clearAllTransactions: () => set({ transactions: [] }),

      files: MOCK_FILES,
      addFile: (file) => set((s) => ({ files: [file, ...s.files] })),
      updateFile: (id, patch) =>
        set((s) => ({
          files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),
      removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),

      // ===== ao vivo =====
      machines: DEFAULT_MACHINES,
      addMachine: (m) => set((s) => ({ machines: [m, ...s.machines] })),
      updateMachine: (id, patch) =>
        set((s) => ({
          machines: s.machines.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      removeMachine: (id) =>
        set((s) => ({ machines: s.machines.filter((m) => m.id !== id) })),

      liveFeed: generateInitialLiveFeed(DEFAULT_RATES, DEFAULT_MACHINES),

      pushLive: () => {
        const { machines, rates } = get();
        // Aceita máquinas conectadas OU simuladas (qualquer uma que não seja manual)
        const utilizaveis = machines.filter(
          (m) => m.status === "conectada" || m.integrationStatus === "simulada"
        );
        if (utilizaveis.length === 0) return null;
        const machine = utilizaveis[Math.floor(Math.random() * utilizaveis.length)];
        const tx = generateLiveTransaction(rates, machine.id);
        set((s) => ({
          liveFeed: [tx, ...s.liveFeed].slice(0, 200),
          machines: s.machines.map((m) =>
            m.id === machine.id
              ? {
                  ...m,
                  ultimaSincronizacao: new Date().toISOString(),
                  totalHoje: +(m.totalHoje + tx.valor).toFixed(2),
                  transacoesHoje: m.transacoesHoje + 1,
                }
              : m
          ),
        }));
        return tx;
      },

      clearLiveFeed: () => set({ liveFeed: [] }),

      initLiveFeed: () => {
        const { rates, machines } = get();
        set({ liveFeed: generateInitialLiveFeed(rates, machines) });
      },

      mergeServerFeed: (server) => {
        if (!server || server.length === 0) return;
        set((s) => {
          const existingIds = new Set(s.liveFeed.map((t) => t.id));
          const onlyNew = server.filter((t) => !existingIds.has(t.id));
          if (onlyNew.length === 0) return s;
          return {
            liveFeed: [...onlyNew, ...s.liveFeed].slice(0, 300),
          };
        });
      },

      // ===== Loja =====
      store: DEFAULT_STORE,
      setStore: (patch) => set((s) => ({ store: { ...s.store, ...patch } })),

      // ===== Produtos =====
      products: enrichWithSales(DEFAULT_PRODUCTS),
      addProduct: (p) => set((s) => ({ products: [p, ...s.products] })),
      updateProduct: (id, patch) =>
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      updateManyProducts: (ids, patch) =>
        set((s) => ({
          products: s.products.map((p) =>
            ids.includes(p.id) ? { ...p, ...patch } : p
          ),
        })),
      removeProduct: (id) =>
        set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
      removeManyProducts: (ids) =>
        set((s) => ({
          products: s.products.filter((p) => !ids.includes(p.id)),
        })),
      resetProducts: () => set({ products: enrichWithSales(DEFAULT_PRODUCTS) }),

      // Entradas de estoque — quando você compra do fornecedor
      stockEntries: [],
      addStockEntry: (e) => {
        set((s) => ({ stockEntries: [e, ...s.stockEntries] }));
        // Auto-atualiza estoque do produto somando a quantidade comprada
        const p = get().products.find((pr) => pr.id === e.produtoId);
        if (p) {
          const novoTotal = (p.quantidadeAprox ?? 0) + e.quantidade;
          get().updateProduct(p.id, {
            quantidadeAprox: novoTotal,
            statusEstoque: "bastante", // acabou de chegar, tem bastante
            ...(e.custoUnitario && !p.custo ? { custo: e.custoUnitario } : {}),
          });
        }
      },
      removeStockEntry: (id) =>
        set((s) => ({ stockEntries: s.stockEntries.filter((e) => e.id !== id) })),

      // Clientes (CRM)
      customers: [],
      addCustomer: (c) => set((s) => ({ customers: [c, ...s.customers] })),
      updateCustomer: (id, patch) =>
        set((s) => ({
          customers: s.customers.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        })),
      removeCustomer: (id) =>
        set((s) => ({ customers: s.customers.filter((c) => c.id !== id) })),
    }),
    {
      name: "conferepix-store",
      version: 4,
      // Mantém persistência local como CACHE/FALLBACK (modo offline).
      // O CloudSync é a fonte de verdade e sobrescreve isso quando o usuário loga.
      // IMPORTANTE: transactions e files NÃO ficam no localStorage
      // porque são muito grandes (mock gera 500+ transactions).
      // Eles ficam SÓ na nuvem via CloudSync.
      // Assim conseguimos importar catálogos grandes (100+ produtos)
      // sem estourar o limite de ~5MB do localStorage.
      partialize: (s) => ({
        rates: s.rates,
        machines: s.machines,
        products: s.products,
        store: s.store,
        stockEntries: s.stockEntries,
        customers: s.customers,
      }),
      storage: {
        getItem: (name) => {
          try {
            const raw = localStorage.getItem(name);
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (e) {
            // Se estourou a quota, tenta limpar caches menos importantes primeiro
            console.warn("[store] localStorage cheio, tentando limpar cache:", e);
            try {
              // Remove chat da Pix e outros caches leves
              localStorage.removeItem("conferepix-chat");
              localStorage.removeItem("conferepix-ai-insights");
              // Tenta salvar de novo
              localStorage.setItem(name, JSON.stringify(value));
            } catch {
              // Se ainda estourou, salva sem os produtos pesados
              // (produtos ficam só na nuvem via CloudSync até o próximo reload)
              console.warn("[store] Ainda cheio. Dados salvos só na nuvem.");
            }
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // ignora
          }
        },
      },
      migrate: (persistedState: unknown, version: number) => {
        const s = persistedState as { machines?: ConnectedMachine[]; rates?: RateConfig };
        if (version < 2 && s?.machines) {
          // Migra maquininhas antigas: completa campos faltantes com defaults
          s.machines = s.machines.map((m) => ({
            ...m,
            taxaPix: m.taxaPix ?? 0.99,
            taxaDebito: m.taxaDebito ?? 1.99,
            taxaCreditoAvista: m.taxaCreditoAvista ?? 3.19,
            taxaCreditoParcelado: m.taxaCreditoParcelado ?? 4.49,
            prazoDebito: m.prazoDebito ?? 1,
            prazoCredito: m.prazoCredito ?? 30,
            integrationStatus: m.integrationStatus ?? "simulada",
          }));
        }
        return s;
      },
      onRehydrateStorage: () => (state) => {
        // Garante que máquinas tenham todos os campos mesmo se a migração não rodou
        if (state?.machines) {
          state.machines = state.machines.map((m) => ({
            ...m,
            taxaPix: m.taxaPix ?? 0.99,
            taxaDebito: m.taxaDebito ?? 1.99,
            taxaCreditoAvista: m.taxaCreditoAvista ?? 3.19,
            taxaCreditoParcelado: m.taxaCreditoParcelado ?? 4.49,
            prazoDebito: m.prazoDebito ?? 1,
            prazoCredito: m.prazoCredito ?? 30,
            integrationStatus: m.integrationStatus ?? "simulada",
          }));
        }
      },
    }
  )
);
