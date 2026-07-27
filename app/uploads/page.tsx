"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Trash2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate, uid, cn } from "@/lib/utils";
import type { FileKind, UploadedFile } from "@/lib/types";

const FILE_KIND_LABELS: Record<FileKind, string> = {
  extrato_bancario: "Extrato bancário",
  relatorio_maquininha: "Relatório da maquininha",
  planilha_vendas: "Planilha de vendas",
};

const FILE_KIND_ICONS: Record<FileKind, typeof FileText> = {
  extrato_bancario: Building2,
  relatorio_maquininha: FileSpreadsheet,
  planilha_vendas: FileText,
};

const FILE_KIND_DESCRIPTIONS: Record<FileKind, string> = {
  extrato_bancario: "CSV ou OFX da sua conta no banco",
  relatorio_maquininha: "Relatório de repasses da Stone, Ton, Cielo...",
  planilha_vendas: "Sua planilha de vendas do balcão",
};

function formatBytes(b: number): string {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / 1024 / 1024).toFixed(1) + " MB";
}

export default function UploadsPage() {
  const mounted = useHasMounted();
  const files = useStore((s) => s.files);
  const addFile = useStore((s) => s.addFile);
  const updateFile = useStore((s) => s.updateFile);
  const removeFile = useStore((s) => s.removeFile);
  const regenerateTransactions = useStore((s) => s.regenerateTransactions);
  const [selectedKind, setSelectedKind] = useState<FileKind>("extrato_bancario");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList) => {
    Array.from(fileList).forEach((file) => {
      const newFile: UploadedFile = {
        id: uid(),
        nome: file.name,
        tipo: selectedKind,
        status: "aguardando",
        tamanho: file.size,
        dataUpload: new Date().toISOString(),
      };
      addFile(newFile);
      // Simula upload + processamento
      setTimeout(() => {
        updateFile(newFile.id, { status: "processando" });
        setTimeout(() => {
          // 90% sucesso, 10% erro pra demo
          const sucesso = Math.random() > 0.1;
          if (sucesso) {
            updateFile(newFile.id, {
              status: "processado",
              linhasProcessadas: Math.floor(Math.random() * 200) + 30,
            });
            regenerateTransactions();
          } else {
            updateFile(newFile.id, {
              status: "erro",
              erros: ["Formato de coluna inválido na linha 12"],
            });
          }
        }, 2200);
      }, 600);
    });
  };

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Uploads</h1>
        <p className="text-muted-foreground mt-1">
          Suba seus extratos e planilhas. A gente cuida do resto.
        </p>
      </div>

      {/* Seletor de tipo de arquivo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.keys(FILE_KIND_LABELS) as FileKind[]).map((kind) => {
          const Icon = FILE_KIND_ICONS[kind];
          const active = selectedKind === kind;
          return (
            <button
              key={kind}
              onClick={() => setSelectedKind(kind)}
              className={cn(
                "text-left p-4 rounded-xl border transition-all",
                active
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <Icon
                className={cn("h-5 w-5 mb-2", active ? "text-primary" : "text-muted-foreground")}
              />
              <div className="font-medium text-sm">{FILE_KIND_LABELS[kind]}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {FILE_KIND_DESCRIPTIONS[kind]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Zona de drop */}
      <Card
        className={cn(
          "p-10 border-2 border-dashed transition-colors cursor-pointer",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="h-7 w-7 text-primary" />
          </div>
          <div className="font-semibold text-foreground">
            Arraste seus arquivos aqui
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ou clique pra escolher do computador
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Formatos aceitos: CSV, XLSX, OFX • Máximo 10 MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.ofx"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </Card>

      {/* Lista de arquivos */}
      <Card>
        <CardHeader>
          <CardTitle>Arquivos enviados</CardTitle>
          <CardDescription>{files.length} no total</CardDescription>
        </CardHeader>
        <div className="px-6 pb-6 -mt-2">
          {files.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum arquivo enviado ainda.
            </div>
          ) : (
            <AnimatePresence>
              <div className="divide-y divide-border">
                {files.map((f) => {
                  const Icon = FILE_KIND_ICONS[f.tipo];
                  return (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          f.status === "processado"
                            ? "bg-success/10 text-success"
                            : f.status === "erro"
                              ? "bg-destructive/10 text-destructive"
                              : f.status === "processando"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                        )}
                      >
                        {f.status === "processando" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : f.status === "processado" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : f.status === "erro" ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{f.nome}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{FILE_KIND_LABELS[f.tipo]}</span>
                          <span>•</span>
                          <span>{formatBytes(f.tamanho)}</span>
                          <span>•</span>
                          <span>{formatRelativeDate(f.dataUpload)}</span>
                        </div>
                        {f.erros && f.erros.length > 0 && (
                          <div className="text-xs text-destructive mt-1">
                            ⚠ {f.erros.join(", ")}
                          </div>
                        )}
                        {f.linhasProcessadas && (
                          <div className="text-xs text-success mt-1">
                            ✓ {f.linhasProcessadas} linhas processadas
                          </div>
                        )}
                      </div>

                      <div className="hidden sm:block">
                        {f.status === "aguardando" && (
                          <Badge variant="outline">Aguardando</Badge>
                        )}
                        {f.status === "processando" && (
                          <Badge variant="default">Processando</Badge>
                        )}
                        {f.status === "processado" && (
                          <Badge variant="success">Processado</Badge>
                        )}
                        {f.status === "erro" && <Badge variant="destructive">Erro</Badge>}
                      </div>

                      <button
                        onClick={() => removeFile(f.id)}
                        className="h-8 w-8 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>
      </Card>
    </div>
  );
}
