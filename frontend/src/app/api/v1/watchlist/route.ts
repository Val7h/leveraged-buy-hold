import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const AddItemSchema = z.object({
  ticker: z.string().min(1).max(20),
  watchlistName: z.string().min(1).max(80).optional(),
  note: z.string().max(500).optional(),
});

/**
 * GET /api/v1/watchlist
 * Retorna os itens da watchlist "Default" do usuário.
 *
 * NÃO escreve no banco: se a watchlist ainda não existe, retorna [] — o POST
 * cria a default sob demanda ao adicionar o primeiro ticker. Um GET que fazia
 * write (create-on-read) era a causa de "Não foi possível carregar a watchlist":
 * falhava onde os GETs read-only de portfolio/alerts passavam.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const watchlist = await prisma.watchlist.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { items: { orderBy: { createdAt: "desc" } } },
  });

  // Ordena pela FORÇA do sinal cacheado (COMPRAR FORTE no topo) — a watchlist mostra primeiro
  // o que está "quicando". Empate → mais recentemente sinalizado. Itens sem cache vão ao fim.
  const RANK: Record<string, number> = {
    "COMPRAR FORTE": 5, COMPRAR: 4, JUSTO: 3, ESTICADO: 2, ESPECULATIVO: 1, RESERVA: 0,
  };
  const items = (watchlist?.items ?? []).slice().sort((a, b) => {
    const ra = RANK[a.lastVerdict ?? ""] ?? -1;
    const rb = RANK[b.lastVerdict ?? ""] ?? -1;
    if (rb !== ra) return rb - ra;
    const ta = a.signalAt ? a.signalAt.getTime() : 0;
    const tb = b.signalAt ? b.signalAt.getTime() : 0;
    return tb - ta;
  });

  // Achatamos para o shape antigo (lista de items) para preservar callers.
  return NextResponse.json(items);
}

/**
 * POST /api/v1/watchlist
 * Adiciona ticker à watchlist default do usuário. Body: { ticker }.
 * Compat: também aceita ?ticker=... via query (legado).
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Aceitar ticker (e nota opcional) via query OU body.
  let rawTicker: string | null = request.nextUrl.searchParams.get("ticker");
  let rawNote: string | null = request.nextUrl.searchParams.get("note");
  if (!rawTicker) {
    try {
      const body = await request.json();
      rawTicker = body?.ticker ?? null;
      rawNote = rawNote ?? body?.note ?? null;
    } catch {
      // body opcional se veio via query
    }
  }

  let parsed;
  try {
    parsed = AddItemSchema.parse({ ticker: rawTicker, note: rawNote ?? undefined });
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_payload", details: (err as z.ZodError).issues ?? null },
      { status: 400 }
    );
  }

  const ticker = parsed.ticker.toUpperCase();

  // Garante watchlist default.
  let watchlist = await prisma.watchlist.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!watchlist) {
    watchlist = await prisma.watchlist.create({
      data: { userId: user.id, name: "Default" },
    });
  }

  try {
    const item = await prisma.watchlistItem.create({
      data: {
        watchlistId: watchlist.id,
        ticker,
        ...(parsed.note?.trim() && { note: parsed.note.trim() }),
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    // P2002 = unique constraint (watchlistId, ticker)
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "already_exists" }, { status: 409 });
    }
    throw err;
  }
}
