"use client";

/**
 * Tela pra configurar e gerenciar o Catálogo Site.
 *
 * Fluxo:
 *  1. Configura slug + URL base das fotos
 *  2. Importa o boots.js atual (cola conteúdo OU arquivo)
 *  3. Ativa o catálogo
 *  4. Copia a linha pra trocar no index.html da Hostinger
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Upload,
  Copy,
  Check,
  RefreshCw,
  Rocket,
  Info,
  Package,
  Sparkles,
  FileCode,
  PowerOff,
  Power,
  AlertTriangle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHasMounted } from "@/lib/useHasMounted";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, uid } from "@/lib/utils";
import type { Product, ProductCategory } from "@/lib/products";

interface BootsItem {
  id?: string;
  code?: string;
  gender?: string;
  brand?: string;
  model?: string;
  material?: string;
  cor?: string;
  tam?: string;
  chars?: string;
  style?: string;
  premium?: boolean;
  isExtra?: boolean;
  faixa?: string;
  preco?: string;
  precoDe?: string;
  photo?: string;
}

// Regex conservador pra extrair array JSON de um trecho tipo:
//   window.BOOTS = [ ... ];
function extrairArray(texto: string): BootsItem[] | null {
  const inicio = texto.indexOf("[");
  const fim = texto.lastIndexOf("]");
  if (inicio < 0 || fim < 0 || fim <= inicio) return null;
  const slice = texto.substring(inicio, fim + 1);
  try {
    return JSON.parse(slice) as BootsItem[];
  } catch {
    return null;
  }
}

// Converte "R$ 250,00" pra 250 (número)
function parsePreco(txt?: string): number {
  if (!txt) return 0;
  const m = txt.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = parseFloat(m);
  return isNaN(n) ? 0 : n;
}

// Mapeia gênero/estilo pra categoria do ConferePix
function inferirCategoria(item: BootsItem): ProductCategory {
  // Chapelaria Garcia = botas → sempre "Calçados"
  return "Calçados";
}

export default function CatalogoSitePage() {
  const mounted = useHasMounted();
  const store = useStore((s) => s.store);
  const setStore = useStore((s) => s.setStore);
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);

  const cat = store.catalogo || {};

  const [slug, setSlug] = useState(cat.slug || "");
  const [fotosBaseUrl, setFotosBaseUrl] = useState(cat.fotosBaseUrl || "");
  const [variavelJs, setVariavelJs] = useState(cat.variavelJs || "BOOTS");
  const [ativo, setAtivo] = useState(!!cat.ativo);
  const [saved, setSaved] = useState(false);
  const [copiado, setCopiado] = useState("");

  // Importador
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<{
    total: number;
    novos: number;
    atualizados: number;
    ignorados: number;
    msg?: string;
  } | null>(null);
  const [importando, setImportando] = useState(false);

  const produtosNoCatalogo = useMemo(
    () => products.filter((p) => p.catalogo?.publicado).length,
    [products]
  );

  if (!mounted) {
    return <div className="h-96 bg-secondary rounded-xl animate-pulse" />;
  }

  const slugValido = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/i.test(slug);

  const handleSalvarConfig = () => {
    if (!slugValido) {
      alert("Slug inválido. Use apenas letras, números e hífen. Ex: chapelariagarcia");
      return;
    }
    setStore({
      catalogo: {
        slug: slug.toLowerCase().trim(),
        fotosBaseUrl: fotosBaseUrl.trim() || undefined,
        variavelJs: variavelJs.trim() || "BOOTS",
        ativo,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleImportar = async () => {
    setImportando(true);
    setImportResult(null);
    try {
      const items = extrairArray(importText);
      if (!items || items.length === 0) {
        setImportResult({
          total: 0,
          novos: 0,
          atualizados: 0,
          ignorados: 0,
          msg: "Não achei um array JSON válido. Cola o conteúdo do boots.js inteiro.",
        });
        return;
      }

      let novos = 0;
      let atualizados = 0;
      let ignorados = 0;

      for (const item of items) {
        const codigoSite = item.code || item.id;
        if (!codigoSite) {
          ignorados++;
          continue;
        }

        // Procura produto existente pelo codigoSite ou codigoBarras
        const existente = products.find(
          (p) =>
            p.catalogo?.codigoSite === codigoSite ||
            p.codigoBarras === codigoSite
        );

        const nomeInferido = [
          item.brand,
          item.model || item.style,
          item.cor,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() || `Produto ${codigoSite}`;

        const precoNum = parsePreco(item.faixa || item.preco);

        const dadosCatalogo: NonNullable<Product["catalogo"]> = {
          codigoSite,
          genero: item.gender as "Masculino" | "Feminino" | "Unissex" | "Infantil" | undefined,
          marca: item.brand || undefined,
          modelo: item.model || undefined,
          material: item.material || undefined,
          cor: item.cor || undefined,
          tamanhos: item.tam || undefined,
          estilo: item.style || undefined,
          caracteristicas: item.chars || undefined,
          faixa: item.faixa || undefined,
          precoDe: item.precoDe || undefined,
          fotoSite: item.photo || undefined,
          premium: !!item.premium,
          superPromocao: !!item.isExtra,
          publicado: true,
        };

        if (existente) {
          updateProduct(existente.id, {
            nome: existente.nome && existente.nome !== `Produto ${codigoSite}` ? existente.nome : nomeInferido,
            preco: existente.preco > 0 ? existente.preco : precoNum,
            categoria: existente.categoria || inferirCategoria(item),
            catalogo: { ...existente.catalogo, ...dadosCatalogo },
          });
          atualizados++;
        } else {
          addProduct({
            id: "prod-" + uid(),
            nome: nomeInferido,
            codigoBarras: codigoSite,
            categoria: inferirCategoria(item),
            preco: precoNum,
            statusEstoque: "nao_informado",
            tipoCadastro: "confirmado",
            criadoEm: new Date().toISOString(),
            catalogo: dadosCatalogo,
          });
          novos++;
        }
      }

      setImportResult({
        total: items.length,
        novos,
        atualizados,
        ignorados,
        msg: `${novos} novos + ${atualizados} atualizados = ${novos + atualizados} produtos prontos!`,
      });
      setImportText("");
    } catch (e) {
      setImportResult({
        total: 0,
        novos: 0,
        atualizados: 0,
        ignorados: 0,
        msg: "Erro: " + (e as Error).message,
      });
    } finally {
      setImportando(false);
    }
  };

  const copiar = async (txt: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiado(tag);
    setTimeout(() => setCopiado(""), 2000);
  };

  const urlEndpoint = slug
    ? `https://confere-pix.vercel.app/api/catalogo/${slug.toLowerCase().trim()}`
    : "";
  const linhaScript = slug
    ? `<script src="${urlEndpoint}"></script>`
    : "";
  const linhaHtmlAntes = `<script src="assets/boots.js"></script>`;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="text-xs text-muted-foreground mb-1">
          <Link href="/" className="hover:text-foreground">
            <ArrowLeft className="inline h-3 w-3 mr-1" />
            Voltar
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Globe className="h-7 w-7 text-primary" />
          Catálogo Site
        </h1>
        <p className="text-muted-foreground mt-1">
          Conecta seu site externo ao ConferePix. Muda produto aqui → aparece no
          site.
        </p>
      </div>

      {/* Status */}
      {slug && (
        <Card className="p-4 bg-gradient-to-r from-primary/5 to-blue-50 dark:from-primary/10 dark:to-blue-950/20 border-primary/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {ativo ? (
                <>
                  <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                  <div>
                    <div className="font-bold text-sm">
                      Catálogo ATIVO · {produtosNoCatalogo} produto(s) publicado(s)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      URL pública: <code className="bg-card px-1.5 py-0.5 rounded text-[10px]">{urlEndpoint}</code>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                  <div>
                    <div className="font-bold text-sm">Catálogo PAUSADO</div>
                    <div className="text-xs text-muted-foreground">
                      Ative pra site externo receber os produtos.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* PASSO 1 — Configuração */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
            1
          </div>
          <div className="font-semibold">Configuração</div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Slug do seu catálogo</Label>
            <div className="flex gap-2 mt-1.5">
              <div className="flex-1 flex items-center rounded-md border border-input bg-background overflow-hidden">
                <span className="px-3 text-xs text-muted-foreground bg-secondary/50 py-2 border-r border-border whitespace-nowrap">
                  /api/catalogo/
                </span>
                <input
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  placeholder="chapelariagarcia"
                  className="flex-1 h-10 px-3 text-sm bg-transparent focus:outline-none"
                  maxLength={30}
                />
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Só letras, números e hífen. Ex: <code>chapelariagarcia</code> ou{" "}
              <code>chap-garcia</code>
            </div>
          </div>

          <div>
            <Label>URL base das fotos (opcional)</Label>
            <Input
              value={fotosBaseUrl}
              onChange={(e) => setFotosBaseUrl(e.target.value)}
              placeholder="https://catalogochapgarcia.com.br"
              className="mt-1.5"
            />
            <div className="text-[10px] text-muted-foreground mt-1">
              Se deixar vazio, as fotos ficam com caminho relativo (ex:{" "}
              <code>fotos/M-01.webp</code>) — funciona quando o site externo
              está no mesmo domínio das fotos. Se preencher, vira URL absoluta.
            </div>
          </div>

          <div>
            <Label>Nome da variável JavaScript</Label>
            <Input
              value={variavelJs}
              onChange={(e) => setVariavelJs(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))}
              placeholder="BOOTS"
              className="mt-1.5"
              maxLength={30}
            />
            <div className="text-[10px] text-muted-foreground mt-1">
              O endpoint gera <code>window.{variavelJs || "BOOTS"} = [...]</code>. Deixa como
              está se seu site já usa <code>BOOTS</code>.
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <div className="flex items-center gap-2">
                {ativo ? (
                  <Power className="h-4 w-4 text-success" />
                ) : (
                  <PowerOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold">
                  {ativo ? "Catálogo ativo" : "Catálogo pausado"}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Quando pausado, o endpoint retorna lista vazia.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAtivo(!ativo)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                ativo ? "bg-success" : "bg-secondary"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform",
                  ativo ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <Button onClick={handleSalvarConfig} disabled={!slugValido} className="w-full">
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                Salvo!
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Salvar configuração
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* PASSO 2 — Importar boots.js */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
            2
          </div>
          <div className="font-semibold">Importar produtos existentes do site</div>
        </div>

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground leading-relaxed">
            Cola aqui o conteúdo do seu arquivo <code>assets/boots.js</code>.
            Você pode abrir o arquivo, selecionar tudo e colar embaixo. Vou
            reconhecer todos os produtos automaticamente.
          </div>

          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Cola o conteúdo do boots.js aqui... (window.BOOTS = [...])"
            className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
          />

          <Button
            onClick={handleImportar}
            disabled={!importText.trim() || importando}
            className="w-full"
            variant="success"
          >
            {importando ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importar produtos
              </>
            )}
          </Button>

          {importResult && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-lg p-3 text-sm",
                importResult.total > 0
                  ? "bg-success/10 border border-success/30 text-success"
                  : "bg-destructive/10 border border-destructive/30 text-destructive"
              )}
            >
              <div className="font-semibold">{importResult.msg}</div>
              {importResult.total > 0 && (
                <div className="text-xs mt-1 opacity-90">
                  🟢 {importResult.novos} novos ·{" "}
                  🔄 {importResult.atualizados} atualizados
                  {importResult.ignorados > 0 &&
                    ` · ⚠️ ${importResult.ignorados} ignorados`}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </Card>

      {/* PASSO 3 — Instrução pra trocar no site */}
      {slug && ativo && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              3
            </div>
            <div className="font-semibold">Ativar no seu site (1 linha só)</div>
          </div>

          <div className="space-y-4">
            <div className="text-xs text-muted-foreground leading-relaxed">
              No seu <code>index.html</code> da Hostinger, encontra essa linha:
            </div>

            <div className="relative">
              <pre className="bg-secondary/60 rounded-md p-3 text-xs font-mono overflow-x-auto border border-border">
                {linhaHtmlAntes}
              </pre>
              <span className="absolute top-2 right-2 text-[10px] text-muted-foreground">
                ANTES
              </span>
            </div>

            <div className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
              <ArrowLeft className="h-3 w-3 mt-0.5 rotate-[-90deg] text-primary" />
              E troca por essa:
            </div>

            <div className="relative">
              <pre className="bg-success/10 border-2 border-success/30 rounded-md p-3 text-xs font-mono overflow-x-auto">
                {linhaScript}
              </pre>
              <button
                type="button"
                onClick={() => copiar(linhaScript, "script")}
                className="absolute top-2 right-2 text-xs bg-primary text-primary-foreground rounded-md px-2 py-1 hover:bg-primary/90"
              >
                {copiado === "script" ? (
                  <>
                    <Check className="inline h-3 w-3" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="inline h-3 w-3" /> Copiar
                  </>
                )}
              </button>
            </div>

            <div className="rounded-lg bg-secondary/30 p-4 space-y-2 text-xs">
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" />
                Como fazer no cPanel da Hostinger:
              </div>
              <ol className="space-y-1.5 list-decimal list-inside text-muted-foreground pl-1">
                <li>Entra no cPanel → Gerenciador de Arquivos</li>
                <li>Vai em <code>public_html/</code></li>
                <li>Abre o arquivo <code>index.html</code> (botão Editar)</li>
                <li>Procura por <code>&lt;script src=&quot;assets/boots.js&quot;&gt;</code></li>
                <li>Troca por: <code>{linhaScript}</code></li>
                <li>Salva. Pronto!</li>
              </ol>
              <div className="pt-1 text-primary font-medium">
                💡 A partir de agora, toda mudança no ConferePix aparece no site
                em segundos.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Ferramentas extras */}
      {slug && ativo && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="font-semibold">Ferramentas</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={urlEndpoint}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border hover:border-primary/40 p-3 flex items-center gap-2 text-sm"
            >
              <FileCode className="h-4 w-4 text-primary" />
              <div>
                <div className="font-semibold">Ver JSON servido</div>
                <div className="text-[10px] text-muted-foreground">
                  Abre o endpoint num tab novo
                </div>
              </div>
            </a>
            <Link
              href="/produtos"
              className="rounded-md border border-border hover:border-primary/40 p-3 flex items-center gap-2 text-sm"
            >
              <Package className="h-4 w-4 text-primary" />
              <div>
                <div className="font-semibold">Gerenciar produtos</div>
                <div className="text-[10px] text-muted-foreground">
                  Editar, ativar/desativar no catálogo
                </div>
              </div>
            </Link>
          </div>
        </Card>
      )}

      {/* Aviso importante */}
      <Card className="p-4 bg-warning/5 border-warning/30">
        <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-foreground">Sobre as fotos:</strong> os
            caminhos das fotos importados (ex:{" "}
            <code>fotos/M-01.webp</code>) continuam apontando pras fotos que já
            estão no seu site. Se cadastrar produto novo aqui no ConferePix,
            também precisa subir a foto correspondente no cPanel da Hostinger
            na pasta <code>fotos/</code>.
          </div>
        </div>
      </Card>
    </div>
  );
}
