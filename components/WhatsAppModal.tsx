"use client";

/**
 * Modal pra escolher mensagem pronta e mandar pra cliente no WhatsApp.
 *
 * Mostra templates predefinidos + permite editar antes de mandar.
 * Abre o link wa.me — funciona em iPhone, Android, desktop.
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Send, Edit3, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import {
  TEMPLATES_WHATSAPP,
  linkWhatsApp,
  sugerirAcoes,
  resumirCliente,
  type Customer,
} from "@/lib/customers";

interface Props {
  cliente: Customer;
  onClose: () => void;
}

export function WhatsAppModal({ cliente, onClose }: Props) {
  const transactions = useStore((s) => s.transactions);
  const nomeLoja = useStore((s) => s.store.nomeLoja) || "nossa loja";

  const resumo = useMemo(
    () => resumirCliente(cliente, transactions),
    [cliente, transactions]
  );
  const sugestoes = useMemo(
    () => sugerirAcoes(cliente, resumo),
    [cliente, resumo]
  );
  const sugestaoIds = new Set(sugestoes.map((s) => s.templateId));

  const [selectedId, setSelectedId] = useState<string>(
    sugestoes[0]?.templateId ?? TEMPLATES_WHATSAPP[0].id
  );
  const [texto, setTexto] = useState(
    TEMPLATES_WHATSAPP.find((t) => t.id === selectedId)?.build(cliente, nomeLoja) ?? ""
  );
  const [editando, setEditando] = useState(false);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const t = TEMPLATES_WHATSAPP.find((tt) => tt.id === id);
    if (t) setTexto(t.build(cliente, nomeLoja));
    setEditando(false);
  };

  const handleEnviar = () => {
    const url = linkWhatsApp(cliente.telefone, texto);
    window.open(url, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-t-2xl sm:rounded-xl max-w-lg w-full max-h-[92vh] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border flex items-center justify-between p-5">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <div>
              <h2 className="text-lg font-semibold">Mandar mensagem</h2>
              <div className="text-xs text-muted-foreground">
                Para {cliente.nome}
                {cliente.telefone ? "" : " — sem telefone (escolhe no WhatsApp)"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-secondary flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Sugestões */}
          {sugestoes.length > 0 && (
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Sugestões pra esse cliente
              </Label>
              <div className="mt-1.5 space-y-1.5">
                {sugestoes.map((s) => {
                  const t = TEMPLATES_WHATSAPP.find((tt) => tt.id === s.templateId);
                  if (!t) return null;
                  const active = selectedId === s.templateId;
                  return (
                    <button
                      key={s.templateId}
                      type="button"
                      onClick={() => handleSelect(s.templateId)}
                      className={`w-full text-left rounded-lg border p-3 transition active:scale-[0.99] ${
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                          : "border-border bg-card hover:bg-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{t.emoji}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{t.titulo}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.motivo}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Todos os templates */}
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Outras mensagens
            </Label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {TEMPLATES_WHATSAPP.filter((t) => !sugestaoIds.has(t.id)).map((t) => {
                const active = selectedId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelect(t.id)}
                    className={`text-left rounded-lg border p-2 transition active:scale-[0.99] ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{t.emoji}</span>
                      <span className="text-xs font-medium truncate">
                        {t.titulo}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview da mensagem */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Mensagem
              </Label>
              <button
                type="button"
                onClick={() => setEditando(!editando)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Edit3 className="h-3 w-3" />
                {editando ? "Pronto" : "Editar"}
              </button>
            </div>
            {editando ? (
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                autoFocus
              />
            ) : (
              <div className="rounded-md bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 p-3 text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                {texto}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border p-4 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Send className="h-4 w-4" />
            Mandar no WhatsApp
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
