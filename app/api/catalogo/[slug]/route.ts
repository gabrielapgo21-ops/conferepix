/**
 * Endpoint público que serve o catálogo de produtos no MESMO formato
 * que o site do usuário espera.
 *
 * URL: /api/catalogo/[slug]
 * Ex:  /api/catalogo/chapelariagarcia
 *
 * Retorna JavaScript: window.BOOTS = [ { id, code, gender, ... } ]
 *
 * O site externo importa via <script src="..."></script>
 *
 * Como funciona:
 * 1. Recebe slug
 * 2. Faz query na tabela user_data buscando quem tem esse slug em store.catalogo.slug
 * 3. Pega os produtos que têm catalogo.publicado === true
 * 4. Formata no shape do site
 * 5. Devolve como JavaScript com CORS aberto
 *
 * Cache: 60s no CDN, 30s no browser (pra atualizações relativamente rápidas)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/products";
import type { StoreSettings } from "@/lib/types";

interface UserData {
  products?: Product[];
  store?: StoreSettings;
}

interface BootsItem {
  id: string;
  code: string;
  gender: string;
  brand: string;
  model: string;
  material: string;
  cor: string;
  tam: string;
  chars: string;
  style: string;
  premium: boolean;
  isExtra: boolean;
  faixa: string;
  preco: string;
  precoDe: string;
  photo: string;
}

function formatProduto(
  p: Product,
  fotosBaseUrl?: string
): BootsItem {
  const cat = p.catalogo || {};
  const codigo = cat.codigoSite || p.codigoBarras || p.id;
  const foto = cat.fotoSite || "";
  // Se tem base URL configurada, prefixa. Senão mantém como veio (relativo).
  const photoFinal =
    foto && fotosBaseUrl && !foto.startsWith("http")
      ? `${fotosBaseUrl.replace(/\/$/, "")}/${foto.replace(/^\//, "")}`
      : foto ||
        (p.fotoUrl?.startsWith("http") || p.fotoUrl?.startsWith("data:")
          ? p.fotoUrl
          : "");

  return {
    id: codigo,
    code: codigo,
    gender: cat.genero || "",
    brand: cat.marca || "",
    model: cat.modelo || "",
    material: cat.material || "",
    cor: cat.cor || "",
    tam: cat.tamanhos || "",
    chars: cat.caracteristicas || "",
    style: cat.estilo || "",
    premium: !!cat.premium,
    isExtra: !!cat.superPromocao,
    faixa: cat.faixa || (p.preco ? `R$ ${p.preco.toFixed(2).replace(".", ",")}` : ""),
    preco: "",
    precoDe: cat.precoDe || "",
    photo: photoFinal,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const slugLimpo = slug.replace(/\.js$/, "").toLowerCase().trim();

  const supUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supService = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Header CORS + JS
  const jsHeaders: Record<string, string> = {
    "Content-Type": "application/javascript; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
  };

  if (!supUrl || !supService) {
    return new NextResponse(
      `/* ConferePix — credenciais não configuradas */\nwindow.BOOTS = [];`,
      { status: 200, headers: jsHeaders }
    );
  }

  try {
    const supabase = createClient(supUrl, supService, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Busca TODOS os user_data e filtra pelo slug em store.catalogo.slug
    // (não dá pra fazer query indexed direto porque o slug tá dentro de JSONB)
    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .filter("data->store->catalogo->>slug", "eq", slugLimpo)
      .limit(1)
      .maybeSingle();

    if (error) {
      return new NextResponse(
        `/* ConferePix — erro: ${error.message.replace(/\*\//g, "*_/")} */\nwindow.BOOTS = [];`,
        { status: 200, headers: jsHeaders }
      );
    }

    if (!data?.data) {
      return new NextResponse(
        `/* ConferePix — catálogo "${slugLimpo}" não encontrado */\nwindow.BOOTS = [];`,
        { status: 200, headers: jsHeaders }
      );
    }

    const userData = data.data as UserData;
    const catalogoConfig = userData.store?.catalogo || {};

    if (!catalogoConfig.ativo) {
      return new NextResponse(
        `/* ConferePix — catálogo "${slugLimpo}" está pausado */\nwindow.BOOTS = [];`,
        { status: 200, headers: jsHeaders }
      );
    }

    const varName =
      (catalogoConfig.variavelJs || "BOOTS")
        .replace(/[^A-Za-z0-9_]/g, "")
        .slice(0, 30) || "BOOTS";

    // Filtra produtos publicados no catálogo
    const products = (userData.products || []).filter(
      (p) => p.catalogo?.publicado
    );

    // Formata cada produto
    const boots = products.map((p) =>
      formatProduto(p, catalogoConfig.fotosBaseUrl)
    );

    const timestamp = new Date().toISOString();
    const js = `/* ConferePix · Catálogo "${slugLimpo}" · ${boots.length} produtos · atualizado ${timestamp} */
window.${varName} = ${JSON.stringify(boots, null, 1)};
`;

    return new NextResponse(js, { status: 200, headers: jsHeaders });
  } catch (e) {
    return new NextResponse(
      `/* ConferePix — erro interno: ${(e as Error).message.replace(/\*\//g, "*_/")} */\nwindow.BOOTS = [];`,
      { status: 200, headers: jsHeaders }
    );
  }
}

// OPTIONS pra CORS preflight (caso algum browser peça)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export const maxDuration = 30;
