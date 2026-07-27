"use client";

/**
 * Central de Ajuda — artigos curtos, busca, vídeos opcionais.
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  HelpCircle,
  Search,
  ChevronRight,
  Clock,
  ArrowUp,
  Sparkles,
  Play,
} from "lucide-react";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ARTIGOS,
  CATEGORIA_EMOJI,
  buscarArtigos,
  artigosPorCategoria,
  type Artigo,
  type CategoriaAjuda,
} from "@/lib/helpArticles";
import { cn } from "@/lib/utils";

export default function AjudaPage() {
  const mounted = useHasMounted();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Artigo | null>(null);

  const filtrados = useMemo(() => buscarArtigos(busca), [busca]);
  const porCategoria = useMemo(() => artigosPorCategoria(), []);
  const categorias = Object.keys(porCategoria) as CategoriaAjuda[];

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  // Visão de artigo aberto
  if (aberto) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 max-w-3xl mx-auto"
      >
        <button
          type="button"
          onClick={() => setAberto(null)}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar pra Central de Ajuda
        </button>

        <Card className="p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-2">
            <span className="text-3xl">{aberto.emoji}</span>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground mb-1">
                {CATEGORIA_EMOJI[aberto.categoria]} {aberto.categoria}
              </div>
              <h1 className="text-2xl font-bold">{aberto.titulo}</h1>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Leitura de ~{aberto.tempo} min
              </div>
            </div>
          </div>

          {/* Vídeo embedável (se você colar URL) */}
          {aberto.videoUrl && (
            <div className="my-5 aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={aberto.videoUrl}
                title={aberto.titulo}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}

          {!aberto.videoUrl && (
            <div className="my-5 rounded-lg border border-dashed border-border bg-secondary/30 p-4 flex items-center gap-3 text-xs text-muted-foreground">
              <Play className="h-4 w-4 flex-shrink-0" />
              <div>
                <strong className="text-foreground">Vídeo em breve.</strong> Vai
                ter passo a passo gravado pra essa pergunta. Por enquanto, lê
                abaixo!
              </div>
            </div>
          )}

          <div className="prose prose-sm max-w-none">
            {renderConteudo(aberto.conteudo)}
          </div>
        </Card>

        <button
          type="button"
          onClick={() => {
            setAberto(null);
            window.scrollTo({ top: 0 });
          }}
          className="text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
        >
          <ArrowUp className="h-3 w-3" />
          Voltar pro topo
        </button>
      </motion.div>
    );
  }

  // Lista de artigos
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-muted-foreground mb-1">
          <Link href="/" className="hover:text-foreground">
            <ArrowLeft className="inline h-3 w-3 mr-1" />
            Voltar
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="h-7 w-7 text-primary" />
          Central de Ajuda
        </h1>
        <p className="text-muted-foreground mt-1">
          Tudo que você precisa saber pra usar o ConferePix.
        </p>
      </div>

      {/* Busca */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar (ex: cadastrar, troco, whatsapp)..."
            className="pl-9"
          />
        </div>
        {busca && (
          <div className="mt-2 text-xs text-muted-foreground">
            {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}
          </div>
        )}
      </Card>

      {/* Card de fallback: pergunta pra Pix */}
      <Card className="p-4 bg-gradient-to-br from-primary/5 via-blue-50 to-purple-50 dark:from-primary/10 dark:via-blue-950/20 dark:to-purple-950/20 border-primary/30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-blue-600 text-primary-foreground flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">Não achou? Pergunta pra Pix</div>
            <div className="text-xs text-muted-foreground">
              Botão azul no canto. Ela responde dúvidas em segundos.
            </div>
          </div>
        </div>
      </Card>

      {/* Resultado de busca */}
      {busca && filtrados.length > 0 && (
        <div className="space-y-2">
          {filtrados.map((a) => (
            <ArtigoCard key={a.id} artigo={a} onClick={() => setAberto(a)} />
          ))}
        </div>
      )}

      {/* Sem busca: agrupado por categoria */}
      {!busca && (
        <div className="space-y-6">
          {categorias.map((cat) => (
            <div key={cat}>
              <div className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                <span className="text-lg">{CATEGORIA_EMOJI[cat]}</span>
                {cat}
                <span className="text-[10px] font-medium text-muted-foreground/60 normal-case">
                  ({porCategoria[cat].length})
                </span>
              </div>
              <div className="space-y-2">
                {porCategoria[cat].map((a) => (
                  <ArtigoCard
                    key={a.id}
                    artigo={a}
                    onClick={() => setAberto(a)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sem resultado */}
      {busca && filtrados.length === 0 && (
        <Card className="p-10 text-center">
          <HelpCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <div className="font-semibold mb-1">
            Não achei nada com &quot;{busca}&quot;
          </div>
          <div className="text-sm text-muted-foreground">
            Tenta outra palavra ou pergunta direto pra Pix (botão azul no canto).
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Card individual
// ============================================================================
function ArtigoCard({
  artigo,
  onClick,
}: {
  artigo: Artigo;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-primary/40 hover:bg-secondary/30 transition flex items-start gap-3 group"
    >
      <span className="text-2xl flex-shrink-0">{artigo.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm leading-tight">{artigo.titulo}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {artigo.resumo}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-2">
          <span className="flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {artigo.tempo} min
          </span>
          {artigo.videoUrl && (
            <span className="flex items-center gap-0.5 text-primary">
              <Play className="h-2.5 w-2.5" />
              Tem vídeo
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
    </button>
  );
}

// ============================================================================
// Renderizador de markdown simples
// ============================================================================
function renderConteudo(texto: string): React.ReactNode {
  // Parser simples: parágrafos por linha em branco, **bold**, listas, headers (linhas que começam com **N.**)
  const linhas = texto.split("\n");
  const elementos: React.ReactNode[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    const texto = buffer.join("\n");
    elementos.push(
      <p
        key={elementos.length}
        className="mb-3 leading-relaxed text-sm whitespace-pre-wrap"
      >
        {renderInline(texto)}
      </p>
    );
    buffer = [];
  };

  for (const linha of linhas) {
    if (linha.trim() === "") {
      flush();
    } else {
      buffer.push(linha);
    }
  }
  flush();

  return elementos;
}

function renderInline(texto: string): React.ReactNode {
  // Substitui **texto** por <strong>texto</strong>
  const partes: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(texto)) !== null) {
    if (match.index > lastIndex) {
      partes.push(texto.slice(lastIndex, match.index));
    }
    partes.push(
      <strong key={key++} className="font-semibold text-foreground">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < texto.length) {
    partes.push(texto.slice(lastIndex));
  }
  return partes;
}
