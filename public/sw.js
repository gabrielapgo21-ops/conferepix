/**
 * ConferePix · Service Worker (v15 — À PROVA DE FALHAS)
 *
 * Regras:
 * 1. NUNCA retorna null/undefined do respondWith — sempre uma Response válida
 * 2. Se qualquer coisa der errado, faz pass-through pro fetch normal do browser
 * 3. Só cacheia respostas de sucesso (status 200 + tipo basic/cors)
 * 4. Sempre pula abas antigas na instalação
 */

const CACHE_VERSION = "conferepix-v19";

const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// =============================================================================
// INSTALL — pré-cacheia o essencial
// =============================================================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) =>
        // Tenta cachear cada URL, mas não falha se alguma der erro
        Promise.all(
          APP_SHELL.map((url) =>
            cache.add(url).catch((err) => {
              console.warn("[SW] falhou cachear", url, err);
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// =============================================================================
// ACTIVATE — apaga caches antigos e assume controle
// =============================================================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      ),
      self.clients.claim(),
    ])
  );
});

// =============================================================================
// MESSAGE — cliente pede pra atualizar
// =============================================================================
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// =============================================================================
// FETCH — estratégia à prova de falhas
// =============================================================================

/**
 * Verifica se uma Response é válida pra cachear.
 */
function isCacheable(res) {
  if (!res) return false;
  if (res.status !== 200) return false;
  if (res.type === "opaque" || res.type === "opaqueredirect") return false;
  return true;
}

/**
 * NUNCA retorna null — em caso de erro, deixa o browser buscar direto.
 * Retorna null aqui = browser vai fazer a request normalmente (bypass).
 * Se retornar undefined = quebra tudo (o bug antigo).
 */
async function handleFetch(request) {
  const url = new URL(request.url);

  // ===== 1. Sempre bypass pra API e Supabase e Cloudflare =====
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase") ||
    url.hostname.includes("cloudflare")
  ) {
    return null; // browser trata normalmente
  }

  // ===== 2. Só cacheia GET =====
  if (request.method !== "GET") {
    return null;
  }

  // ===== 3. Navegação (HTML): network-first, cache como último recurso =====
  if (request.mode === "navigate") {
    try {
      const res = await fetch(request);
      // Só cacheia se válido
      if (isCacheable(res)) {
        try {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(request, res.clone()).catch(() => {});
        } catch {
          // ignora erro de cache
        }
      }
      return res;
    } catch {
      // Offline: tenta cache
      try {
        const cached = await caches.match(request);
        if (cached) return cached;
        const home = await caches.match("/");
        if (home) return home;
      } catch {
        // ignora
      }
      // Nada no cache: retorna página de erro simples (nunca null!)
      return new Response(
        `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem internet</title><style>body{font-family:system-ui;background:#f3f4f6;color:#111;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px;text-align:center}h1{font-size:20px;margin:0 0 8px}p{color:#666;margin:0 0 16px}button{background:#1D6EE6;color:white;border:0;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer}</style></head><body><div><h1>📶 Sem internet</h1><p>Verifica sua conexão e tenta de novo.</p><button onclick="location.reload()">Tentar de novo</button></div></body></html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }
  }

  // ===== 4. Assets: cache-first =====
  try {
    const cached = await caches.match(request);
    if (cached) return cached;
    const res = await fetch(request);
    if (isCacheable(res)) {
      try {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(request, res.clone()).catch(() => {});
      } catch {
        // ignora
      }
    }
    return res;
  } catch {
    // Offline e sem cache pra esse asset — retorna null pra browser lidar
    return null;
  }
}

self.addEventListener("fetch", (event) => {
  // Se handleFetch retornar null, NÃO chama respondWith — browser trata normalmente
  event.respondWith(
    (async () => {
      const res = await handleFetch(event.request);
      if (res) return res;
      // Fallback final: fetch normal — nunca deixa null passar
      try {
        return await fetch(event.request);
      } catch {
        // Último recurso — Response vazia mas válida
        return new Response("", { status: 504, statusText: "Gateway Timeout" });
      }
    })()
  );
});
