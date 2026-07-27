/**
 * Devolve as transações reais que chegaram via webhook do MP.
 * O client faz polling deste endpoint a cada N segundos.
 */
import { NextResponse } from "next/server";
import { readFeed, clearFeed } from "@/lib/serverStore";

export async function GET() {
  const feed = await readFeed();
  return NextResponse.json({
    transactions: feed,
    count: feed.length,
    lastUpdate: feed[0]?.data ?? null,
  });
}

export async function DELETE() {
  await clearFeed();
  return NextResponse.json({ ok: true });
}
