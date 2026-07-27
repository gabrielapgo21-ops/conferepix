/**
 * Métricas globais — só pra usuário com role 'owner' ou 'admin'.
 * Conta usuários, transações, divergências, etc. (sem expor dados pessoais).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  // Confirma que é dona
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { data: meu } = await supabase
    .from("user_data")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = meu?.role ?? "cliente";
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  }

  // Métricas agregadas — usuários e contagens
  const { count: totalUsuarios } = await supabase
    .from("user_data")
    .select("*", { count: "exact", head: true });

  const { count: totalTransacoesFeed } = await supabase
    .from("live_feed")
    .select("*", { count: "exact", head: true });

  // Distribuição de planos
  const { data: porPlano } = await supabase
    .from("user_data")
    .select("plano");

  const distribuicaoPlanos: Record<string, number> = {};
  (porPlano ?? []).forEach((p) => {
    distribuicaoPlanos[p.plano] = (distribuicaoPlanos[p.plano] ?? 0) + 1;
  });

  // Lojas conectadas com MP
  const { count: comMP } = await supabase
    .from("user_data")
    .select("*", { count: "exact", head: true })
    .not("mp_access_token", "is", null);

  // Lista de contas (só info básica — sem dados sensíveis)
  const { data: contas } = await supabase
    .from("user_data")
    .select("user_id, role, plano, updated_at, mp_access_token")
    .order("updated_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    totalUsuarios: totalUsuarios ?? 0,
    totalTransacoesFeed: totalTransacoesFeed ?? 0,
    distribuicaoPlanos,
    comMP: comMP ?? 0,
    contas: (contas ?? []).map((c) => ({
      user_id: c.user_id,
      role: c.role,
      plano: c.plano,
      ultimaAtualizacao: c.updated_at,
      mpConectado: !!c.mp_access_token,
    })),
  });
}
