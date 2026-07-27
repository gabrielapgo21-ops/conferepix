/**
 * Configuração da integração com Mercado Pago.
 * GET → status (mascarado, sem expor o token completo)
 * POST → grava o Access Token + ambiente
 * DELETE → desconecta
 */
import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig, maskConfig } from "@/lib/serverStore";

export async function GET() {
  const config = await readConfig();
  return NextResponse.json(maskConfig(config));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { mpAccessToken, mpMaquininhaId } = body as {
    mpAccessToken?: string;
    mpMaquininhaId?: string;
  };

  if (!mpAccessToken || typeof mpAccessToken !== "string") {
    return NextResponse.json({ error: "mpAccessToken obrigatório" }, { status: 400 });
  }

  // Detecta ambiente pelo prefixo do token
  const ambiente: "test" | "producao" = mpAccessToken.startsWith("TEST-")
    ? "test"
    : "producao";

  // Valida token chamando endpoint /users/me do MP
  let valido = false;
  let userInfo: { nickname?: string; email?: string } | null = null;
  try {
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      valido = true;
      const data = (await res.json()) as { nickname?: string; email?: string };
      userInfo = { nickname: data.nickname, email: data.email };
    }
  } catch {
    valido = false;
  }

  if (!valido) {
    return NextResponse.json(
      {
        error:
          "Token recusado pelo Mercado Pago. Confira se copiou o Access Token (não a Public Key).",
      },
      { status: 400 }
    );
  }

  const saved = await writeConfig({
    mpAccessToken,
    mpAmbiente: ambiente,
    mpMaquininhaId: mpMaquininhaId ?? "mp-default",
  });

  return NextResponse.json({
    ok: true,
    ambiente,
    userInfo,
    config: maskConfig(saved),
  });
}

export async function DELETE() {
  await writeConfig({ mpAccessToken: undefined, mpAmbiente: undefined });
  return NextResponse.json({ ok: true });
}
