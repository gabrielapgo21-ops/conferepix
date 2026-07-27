"use client";

import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  X,
  Package,
  TrendingUp,
  CheckCircle2,
  Camera,
  Image as ImageIcon,
  Trash2,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScannerModal } from "@/components/ScannerModal";
import { CameraCapture } from "@/components/CameraCapture";
import { uid, cn, formatBRL } from "@/lib/utils";
import { comprimirImagem } from "@/lib/imageUtils";
import {
  PRODUCT_CATEGORIES,
  ESTOQUE_LABELS,
  TIPO_LABELS,
  getMissingFields,
  type Product,
  type EstoqueStatus,
  type CadastroTipo,
  type ProductCategory,
} from "@/lib/products";

interface Props {
  onClose: () => void;
  onSave: (p: Product) => void;
  initial?: Product;
}

const EMOJIS_DEFAULT = [
  "👜",
  "👛",
  "👚",
  "👗",
  "👡",
  "👠",
  "🎀",
  "💎",
  "💍",
  "🧴",
  "💄",
  "🧥",
  "🩱",
  "👒",
  "🧢",
  "🕶️",
  "📿",
  "👕",
  "🥿",
  "📦",
];

export function ProdutoModal({ onClose, onSave, initial }: Props) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [codigoBarras, setCodigoBarras] = useState(initial?.codigoBarras ?? "");
  const [categoria, setCategoria] = useState<ProductCategory | "">(
    initial?.categoria ?? ""
  );
  const [preco, setPreco] = useState(initial?.preco ?? 0);
  const [custo, setCusto] = useState(initial?.custo ?? 0);
  const [fotoUrl, setFotoUrl] = useState(initial?.fotoUrl ?? "");
  const [statusEstoque, setStatusEstoque] = useState<EstoqueStatus>(
    initial?.statusEstoque ?? "nao_informado"
  );
  const [tipoCadastro, setTipoCadastro] = useState<CadastroTipo>(
    initial?.tipoCadastro ?? "confirmado"
  );
  const [quantidadeAprox, setQuantidadeAprox] = useState(initial?.quantidadeAprox ?? 0);
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [showScanner, setShowScanner] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    nome: string;
    categoria: ProductCategory;
    cor?: string;
    coresSecundarias?: string[];
    modelo?: string;
    material?: string;
    padrao?: string;
    estilo?: string;
    publico?: string;
    estacao?: string;
    acabamento?: string;
    ocasiao?: string;
    descricaoCurta?: string;
    descricaoRica?: string;
    hashtags?: string[];
    observacoes?: string;
    precoSugerido?: number;
    confianca: number;
    mock?: boolean;
  } | null>(null);
  const [detalhesExpanded, setDetalhesExpanded] = useState(true);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isRealPhoto =
    !!fotoUrl && (fotoUrl.startsWith("data:") || fotoUrl.startsWith("http"));

  const analyzePhoto = async (dataUrl: string) => {
    setAnalyzing(true);
    setAiSuggestion(null);
    try {
      const res = await fetch("/api/ai/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagem: dataUrl }),
      });
      const json = await res.json();
      if (json.ok && json.sugestao) {
        setAiSuggestion({ ...json.sugestao, mock: json.modo === "mock" });
      }
    } catch {
      // silenciosamente ignora — não bloqueia o cadastro
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileSelect = async (file: File | null | undefined) => {
    if (!file) return;
    setCompressing(true);
    try {
      const data = await comprimirImagem(file, 800, 0.82);
      setFotoUrl(data);
      // Roda IA em background depois que comprimir
      analyzePhoto(data);
    } catch (e) {
      alert("Não consegui processar essa foto: " + (e as Error).message);
    } finally {
      setCompressing(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    // Só preenche campos vazios — não sobrescreve o que você já digitou
    if (!nome) setNome(aiSuggestion.nome);
    if (!categoria && aiSuggestion.categoria) setCategoria(aiSuggestion.categoria);
    if ((preco ?? 0) <= 0 && aiSuggestion.precoSugerido) {
      setPreco(aiSuggestion.precoSugerido);
    }
    if (!observacoes) {
      // Monta observações ricas com todos os detalhes descobertos
      const partes: string[] = [];
      if (aiSuggestion.descricaoCurta) partes.push(aiSuggestion.descricaoCurta);
      const atributos: string[] = [];
      if (aiSuggestion.cor) atributos.push(`Cor: ${aiSuggestion.cor}`);
      if (aiSuggestion.coresSecundarias?.length) {
        atributos.push(`Outras cores: ${aiSuggestion.coresSecundarias.join(", ")}`);
      }
      if (aiSuggestion.material) atributos.push(`Material: ${aiSuggestion.material}`);
      if (aiSuggestion.padrao) atributos.push(`Padrão: ${aiSuggestion.padrao}`);
      if (aiSuggestion.estilo) atributos.push(`Estilo: ${aiSuggestion.estilo}`);
      if (aiSuggestion.publico) atributos.push(`Público: ${aiSuggestion.publico}`);
      if (aiSuggestion.estacao) atributos.push(`Estação: ${aiSuggestion.estacao}`);
      if (aiSuggestion.ocasiao) atributos.push(`Ocasião: ${aiSuggestion.ocasiao}`);
      if (aiSuggestion.acabamento) atributos.push(`Detalhes: ${aiSuggestion.acabamento}`);
      if (atributos.length) partes.push(atributos.join(" · "));
      if (aiSuggestion.observacoes) partes.push(aiSuggestion.observacoes);
      setObservacoes(partes.join("\n\n"));
    }
    setAiSuggestion(null);
  };

  const margem = useMemo(() => {
    if (!preco || !custo || preco <= 0) return null;
    return ((preco - custo) / preco) * 100;
  }, [preco, custo]);

  const previewProduct: Product = {
    id: initial?.id ?? "preview",
    nome,
    codigoBarras: codigoBarras || undefined,
    categoria: categoria || undefined,
    preco,
    custo: custo || undefined,
    fotoUrl: fotoUrl || undefined,
    statusEstoque,
    tipoCadastro,
    quantidadeAprox: quantidadeAprox || undefined,
    observacoes: observacoes || undefined,
    criadoEm: initial?.criadoEm ?? new Date().toISOString(),
  };
  const missing = getMissingFields(previewProduct);

  const handleSave = () => {
    if (!nome) return;
    onSave({
      ...previewProduct,
      id: initial?.id ?? "prod-" + uid(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border flex items-center justify-between p-5">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {initial ? "Editar produto" : "Cadastrar novo produto"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-secondary flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Foto + nome */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="relative h-24 w-24 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                {compressing ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : isRealPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fotoUrl}
                    alt="Foto do produto"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">{fotoUrl || "📦"}</span>
                )}
                {isRealPhoto && !compressing && (
                  <button
                    type="button"
                    onClick={() => setFotoUrl("")}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <Label className="text-[10px] text-muted-foreground">Foto</Label>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label>Nome do produto</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Bolsa feminina caramelo"
                  className="mt-1.5"
                />
              </div>
              {/* Botões de foto */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCamera(true)}
                  disabled={compressing}
                  className="text-xs"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Tirar foto
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={compressing}
                  className="text-xs"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Galeria
                </Button>
                {/* Input só pra galeria — câmera agora usa CameraCapture (getUserMedia) */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">
                  Ou escolhe um emoji
                </Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {EMOJIS_DEFAULT.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setFotoUrl(e)}
                      className={cn(
                        "h-8 w-8 rounded-md text-lg hover:bg-secondary transition-colors",
                        fotoUrl === e && "bg-primary/10 ring-2 ring-primary/40"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Banner da IA */}
          {analyzing && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 border border-primary/30 rounded-lg p-3 flex items-center gap-2.5"
            >
              <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-foreground">
                  🤖 Analisando foto…
                </div>
                <div className="text-muted-foreground">
                  Já já te mostro o que vi.
                </div>
              </div>
            </motion.div>
          )}
          {aiSuggestion && !analyzing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-primary/5 to-success/5 border-2 border-primary/30 rounded-xl overflow-hidden"
            >
              <div className="p-3 pb-2 flex items-center justify-between bg-primary/10">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-blue-600 text-primary-foreground flex items-center justify-center">
                    <Wand2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Pix analisou a foto</div>
                    <div className="text-[10px] text-muted-foreground">
                      Encontrou {[
                        aiSuggestion.cor,
                        aiSuggestion.material,
                        aiSuggestion.padrao,
                        aiSuggestion.estilo,
                        aiSuggestion.publico,
                        aiSuggestion.estacao,
                        aiSuggestion.acabamento,
                        aiSuggestion.ocasiao,
                      ].filter(Boolean).length}{" "}
                      detalhes
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[9px]">
                    {Math.round(aiSuggestion.confianca * 100)}%
                  </Badge>
                  {aiSuggestion.mock && (
                    <Badge variant="outline" className="text-[9px]">
                      Demo
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-3 space-y-2.5">
                {/* Nome destaque */}
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                    Produto
                  </div>
                  <div className="font-bold text-base">{aiSuggestion.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    📁 {aiSuggestion.categoria}
                    {aiSuggestion.precoSugerido && (
                      <span className="ml-2 text-success font-semibold">
                        💰 Sugere {formatBRL(aiSuggestion.precoSugerido)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Descrição curta */}
                {aiSuggestion.descricaoCurta && (
                  <div className="bg-card/50 rounded-md p-2 text-xs italic text-muted-foreground border-l-2 border-primary/30">
                    {aiSuggestion.descricaoCurta}
                  </div>
                )}

                {/* Toggle detalhes */}
                <button
                  type="button"
                  onClick={() => setDetalhesExpanded(!detalhesExpanded)}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  {detalhesExpanded ? "▼ Esconder detalhes" : "▶ Ver todos os detalhes"}
                </button>

                {/* Grid de detalhes */}
                {detalhesExpanded && (
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {aiSuggestion.cor && (
                      <DetailChip label="Cor" value={aiSuggestion.cor} emoji="🎨" />
                    )}
                    {aiSuggestion.coresSecundarias && aiSuggestion.coresSecundarias.length > 0 && (
                      <DetailChip
                        label="Outras cores"
                        value={aiSuggestion.coresSecundarias.join(", ")}
                        emoji="🌈"
                      />
                    )}
                    {aiSuggestion.material && (
                      <DetailChip label="Material" value={aiSuggestion.material} emoji="🧵" />
                    )}
                    {aiSuggestion.padrao && (
                      <DetailChip label="Padrão" value={aiSuggestion.padrao} emoji="✨" />
                    )}
                    {aiSuggestion.estilo && (
                      <DetailChip label="Estilo" value={aiSuggestion.estilo} emoji="💫" />
                    )}
                    {aiSuggestion.publico && (
                      <DetailChip label="Público" value={aiSuggestion.publico} emoji="👤" />
                    )}
                    {aiSuggestion.estacao && (
                      <DetailChip label="Estação" value={aiSuggestion.estacao} emoji="🌤️" />
                    )}
                    {aiSuggestion.ocasiao && (
                      <DetailChip label="Ocasião" value={aiSuggestion.ocasiao} emoji="📅" />
                    )}
                    {aiSuggestion.acabamento && (
                      <DetailChip
                        label="Acabamento"
                        value={aiSuggestion.acabamento}
                        emoji="🪡"
                        wide
                      />
                    )}
                  </div>
                )}

                {/* Hashtags */}
                {detalhesExpanded && aiSuggestion.hashtags && aiSuggestion.hashtags.length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                      Hashtags sugeridas
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {aiSuggestion.hashtags.map((h) => (
                        <span
                          key={h}
                          className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Descrição rica (em EN — mas útil) */}
                {detalhesExpanded && aiSuggestion.descricaoRica && (
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                      Descrição rica (use no marketplace)
                    </div>
                    <div className="text-xs bg-card/50 rounded-md p-2 leading-relaxed">
                      {aiSuggestion.descricaoRica}
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={applyAiSuggestion}
                    variant="success"
                    className="text-xs h-9 flex-1"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Aplicar tudo
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAiSuggestion(null)}
                    className="text-xs h-9"
                  >
                    Ignorar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Código + categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>
                Código de barras{" "}
                <span className="text-muted-foreground font-normal">(se tiver)</span>
              </Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  placeholder="789012345..."
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowScanner(true)}
                  title="Bipar com a câmera"
                  className="px-3"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                💡 Clica na câmera pra bipar o código
              </p>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as ProductCategory | "")}
                className="mt-1.5"
              >
                <option value="">Sem categoria</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Preço + custo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço de venda (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={preco}
                onChange={(e) => setPreco(parseFloat(e.target.value) || 0)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>
                Custo de compra{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                value={custo}
                onChange={(e) => setCusto(parseFloat(e.target.value) || 0)}
                className="mt-1.5"
              />
            </div>
          </div>

          {margem !== null && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-success" />
              <span>
                Margem estimada:{" "}
                <strong className="text-success">{margem.toFixed(1)}%</strong> —
                lucro de{" "}
                <strong>{formatBRL(preco - custo)}</strong> por unidade
              </span>
            </div>
          )}

          {/* Estoque */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Como está o estoque?</Label>
              <Select
                value={statusEstoque}
                onChange={(e) => setStatusEstoque(e.target.value as EstoqueStatus)}
                className="mt-1.5"
              >
                {(Object.keys(ESTOQUE_LABELS) as EstoqueStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {ESTOQUE_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>
                Quantidade aprox.{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                type="number"
                value={quantidadeAprox}
                onChange={(e) => setQuantidadeAprox(parseInt(e.target.value) || 0)}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Tipo de cadastro */}
          <div>
            <Label>Tipo de cadastro</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
              {(Object.keys(TIPO_LABELS) as CadastroTipo[]).map((t) => {
                const active = tipoCadastro === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipoCadastro(t)}
                    className={cn(
                      "p-2 rounded-lg border text-xs font-semibold transition-all",
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40 text-muted-foreground"
                    )}
                  >
                    {TIPO_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label>
              Observações{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Anote qualquer detalhe sobre esse produto"
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Status do cadastro */}
          {missing.length > 0 ? (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
              <div className="text-xs font-semibold text-warning mb-1">
                Cadastro ainda incompleto. Falta:
              </div>
              <div className="flex flex-wrap gap-1">
                {missing.map((m) => (
                  <Badge key={m} variant="warning" className="text-[10px]">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              Cadastro completo! Pode salvar.
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 p-5 border-t border-border bg-secondary/30">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!nome}>
            {initial ? "Salvar alterações" : "Cadastrar produto"}
          </Button>
        </div>
      </motion.div>

      {showScanner && (
        <ScannerModal
          onClose={() => setShowScanner(false)}
          onScan={(code) => {
            setCodigoBarras(code);
            setShowScanner(false);
          }}
        />
      )}

      {/* Câmera nativa — funciona em iOS PWA standalone (diferente do input file) */}
      <CameraCapture
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(dataUrl) => {
          // O dataUrl já vem comprimido a 88% qualidade — passamos direto pro pipeline
          setShowCamera(false);
          // Reaproveita o pipeline: cria File falso pra reusar comprimirImagem
          fetch(dataUrl)
            .then((r) => r.blob())
            .then((blob) => {
              const file = new File([blob], "foto.jpg", { type: "image/jpeg" });
              handleFileSelect(file);
            });
        }}
      />
    </div>
  );
}

// =============================================================================
// Chip de detalhe — usado pela sugestão da IA pra mostrar cada atributo
// =============================================================================
function DetailChip({
  label,
  value,
  emoji,
  wide = false,
}: {
  label: string;
  value: string;
  emoji?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-card/70 border border-border rounded-md p-1.5",
        wide && "col-span-2"
      )}
    >
      <div className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold leading-none">
        {emoji} {label}
      </div>
      <div className="text-xs font-semibold mt-0.5 leading-tight">{value}</div>
    </div>
  );
}
