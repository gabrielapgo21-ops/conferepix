"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, User, Phone, Cake, Mail, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { uid } from "@/lib/utils";
import { formatarTelefone, limparTelefone, type Customer } from "@/lib/customers";

interface Props {
  onClose: () => void;
  onSave: (c: Customer) => void;
  onDelete?: () => void;
  initial?: Customer;
}

export function ClienteModal({ onClose, onSave, onDelete, initial }: Props) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [telefone, setTelefone] = useState(
    initial?.telefone ? formatarTelefone(initial.telefone) : ""
  );
  const [aniversario, setAniversario] = useState(initial?.aniversario ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [obs, setObs] = useState(initial?.observacoes ?? "");

  const handleSave = () => {
    if (!nome.trim()) return;
    onSave({
      id: initial?.id ?? "cust-" + uid(),
      nome: nome.trim(),
      telefone: telefone ? limparTelefone(telefone) : undefined,
      aniversario: aniversario || undefined,
      email: email.trim() || undefined,
      observacoes: obs.trim() || undefined,
      criadoEm: initial?.criadoEm ?? new Date().toISOString(),
      tags: initial?.tags,
    });
  };

  // Aniversário: aceita formato DD/MM ou YYYY-MM-DD via input date
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-xl max-w-md w-full max-h-[92vh] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border flex items-center justify-between p-5">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {initial ? "Editar cliente" : "Cadastrar cliente"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-secondary flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <Label className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Maria Silva"
              className="mt-1.5"
              autoFocus
            />
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              WhatsApp
            </Label>
            <Input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(11) 99999-9999"
              className="mt-1.5"
              inputMode="numeric"
            />
            <div className="text-[10px] text-muted-foreground mt-1">
              Com DDD. Vai usar pra mandar cupons/mensagens.
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <Cake className="h-3.5 w-3.5" />
              Aniversário
            </Label>
            <Input
              type="date"
              value={
                aniversario && aniversario.length === 10
                  ? aniversario
                  : aniversario
                    ? `2000-${aniversario.split("-")[0]?.padStart(2, "0")}-${aniversario.split("-")[1]?.padStart(2, "0")}`
                    : ""
              }
              onChange={(e) => setAniversario(e.target.value)}
              className="mt-1.5"
            />
            <div className="text-[10px] text-muted-foreground mt-1">
              Pode esquecer o ano — a gente usa só dia/mês.
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email (opcional)
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Observações (opcional)</Label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex: prefere produtos pretos, tem cachorro, sempre vem com a amiga..."
              className="mt-1.5 w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border p-4 flex items-center justify-between gap-2">
          {initial && onDelete ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Apagar cliente "${initial.nome}"?`)) {
                  onDelete();
                }
              }}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Apagar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!nome.trim()}>
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
