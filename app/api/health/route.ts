/**
 * Diagnóstico DETALHADO da conexão Supabase.
 * Testa múltiplos endpoints com múltiplas variações de auth.
 */

import { NextResponse } from "next/server";

async function testUrl(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 10000
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    const txt = await res.text();
    return {
      status: res.status,
      ok: res.ok,
      body: txt.slice(0, 300),
      headers: {
        "content-type": res.headers.get("content-type"),
      },
    };
  } catch (e) {
    const err = e as Error;
    return {
      erro: err.message,
      name: err.name,
      cause: err.cause ? String(err.cause).slice(0, 200) : null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const diag: Record<string, unknown> = {
    ok: true,
    timestamp: new Date().toISOString(),
    env: process.env.VERCEL_ENV || "unknown",
    node_version: process.version,
    runtime: process.env.NEXT_RUNTIME || "nodejs",
  };

  const supUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  diag.supabase = {
    hasUrl: !!supUrl,
    urlPrefix: supUrl ? supUrl.slice(0, 40) : null,
    hasAnonKey: !!supKey,
    anonKeyLength: supKey?.length || 0,
    anonKeyPrefix: supKey ? supKey.slice(0, 20) + "..." : null,
    anonKeyType: supKey?.startsWith("sb_publishable_")
      ? "publishable (novo)"
      : supKey?.startsWith("eyJ")
        ? "JWT anon (legacy)"
        : "desconhecido",
  };

  const cfAcc = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfTok = process.env.CLOUDFLARE_API_TOKEN;
  diag.cloudflare = {
    hasAccountId: !!cfAcc,
    accountIdLength: cfAcc?.length || 0,
    hasApiToken: !!cfTok,
    apiTokenLength: cfTok?.length || 0,
  };

  if (supUrl && supKey) {
    // Teste 1: raiz do Supabase sem auth (deve dar 404 mas fetch precisa completar)
    diag.testRootSemAuth = await testUrl(supUrl, {});

    // Teste 2: /auth/v1/settings com apikey header
    diag.testSettings = await testUrl(`${supUrl}/auth/v1/settings`, {
      apikey: supKey,
    });

    // Teste 3: /auth/v1/settings com Bearer
    diag.testSettingsBearer = await testUrl(`${supUrl}/auth/v1/settings`, {
      apikey: supKey,
      Authorization: `Bearer ${supKey}`,
    });

    // Teste 4: /rest/v1/ com apikey
    diag.testRest = await testUrl(`${supUrl}/rest/v1/`, {
      apikey: supKey,
      Authorization: `Bearer ${supKey}`,
    });

    // Teste 5: DNS lookup — se falhar aqui, é problema de rede Vercel
    try {
      const dns = await import("node:dns/promises");
      const host = new URL(supUrl).hostname;
      const addrs = await dns.resolve4(host).catch((e) => ({
        erro: (e as Error).message,
      }));
      diag.testDNS = { host, resultado: addrs };
    } catch (e) {
      diag.testDNS = { erro: (e as Error).message };
    }
  }

  return NextResponse.json(diag, {
    headers: { "Cache-Control": "no-store" },
  });
}
