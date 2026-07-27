import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Protege todas as rotas exceto login, cadastro e ativos públicos.
 * Renova a sessão automaticamente em cada request.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const PUBLIC = ["/login", "/cadastro", "/auth", "/reset"];
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  // Não logado tentando acessar rota privada → vai pro login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Logado tentando ir pra login/cadastro → manda pro dashboard
  if (user && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico, manifest.json, sw.js
     * - icons/* e splash/* (assets PWA)
     * - api/webhooks/* (webhook MP precisa ser público pro MP chamar)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|splash|reset.html|teste-supabase.html|api/webhooks|api/ai/debug|api/ai/accept-license|api/ai/chat-debug|api/health|api/catalogo).*)",
  ],
};
