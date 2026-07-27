/**
 * Persistência server-side via Supabase.
 * Cada usuário tem o próprio user_data (config MP) e live_feed (transações).
 */

import { createClient } from "@/lib/supabase/server";
import type { LiveTransaction } from "./types";

export interface ServerConfig {
  mpAccessToken?: string;
  mpAmbiente?: "test" | "producao";
  mpMaquininhaId?: string;
  ultimaAtualizacao?: string;
}

/**
 * Lê config do usuário logado. Retorna {} se não tiver sessão ou config.
 */
export async function readConfig(): Promise<ServerConfig> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from("user_data")
      .select("mp_access_token, mp_ambiente, mp_maquininha_id, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) return {};

    return {
      mpAccessToken: data.mp_access_token ?? undefined,
      mpAmbiente: data.mp_ambiente ?? undefined,
      mpMaquininhaId: data.mp_maquininha_id ?? undefined,
      ultimaAtualizacao: data.updated_at ?? undefined,
    };
  } catch {
    return {};
  }
}

export async function writeConfig(
  patch: Partial<ServerConfig>
): Promise<ServerConfig> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const updates: Record<string, unknown> = {};
  if ("mpAccessToken" in patch) updates.mp_access_token = patch.mpAccessToken ?? null;
  if ("mpAmbiente" in patch) updates.mp_ambiente = patch.mpAmbiente ?? null;
  if ("mpMaquininhaId" in patch)
    updates.mp_maquininha_id = patch.mpMaquininhaId ?? null;

  const { data, error } = await supabase
    .from("user_data")
    .upsert(
      { user_id: user.id, ...updates },
      { onConflict: "user_id", ignoreDuplicates: false }
    )
    .select("mp_access_token, mp_ambiente, mp_maquininha_id, updated_at")
    .single();

  if (error) throw error;

  return {
    mpAccessToken: data.mp_access_token ?? undefined,
    mpAmbiente: data.mp_ambiente ?? undefined,
    mpMaquininhaId: data.mp_maquininha_id ?? undefined,
    ultimaAtualizacao: data.updated_at ?? undefined,
  };
}

export function maskConfig(c: ServerConfig) {
  const token = c.mpAccessToken;
  return {
    mpConfigurado: !!token,
    mpAmbiente: c.mpAmbiente,
    mpAccessTokenMasked: token
      ? token.slice(0, 8) + "•••••••••••" + token.slice(-4)
      : null,
    mpMaquininhaId: c.mpMaquininhaId,
    ultimaAtualizacao: c.ultimaAtualizacao,
  };
}

// ============================================================
// Live feed
// ============================================================

export async function readFeed(): Promise<LiveTransaction[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("live_feed")
      .select("data")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300);

    if (error || !data) return [];
    return data.map((row) => row.data as LiveTransaction);
  } catch {
    return [];
  }
}

export async function appendToFeed(tx: LiveTransaction): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase
    .from("live_feed")
    .upsert(
      { id: tx.id, user_id: user.id, data: tx },
      { onConflict: "id", ignoreDuplicates: false }
    );

  if (error) throw error;
}

export async function clearFeed(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  await supabase.from("live_feed").delete().eq("user_id", user.id);
}
