import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const AddItemSchema = z.object({
  ticker: z.string().min(1).max(20),
  watchlistName: z.string().min(1).max(80).optional(),
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

  // Achatamos para o shape antigo (lista de items) para preservar callers.
  return NextResponse.json(watchlist?.items ?? []);
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

  // Aceitar ticker via body OU query (legado lib/api.ts manda em query).
  let rawTicker: string | null = request.nextUrl.searchParams.get("ticker");
  if (!rawTicker) {
    try {
      const body = await request.json();
      rawTicker = body?.ticker ?? null;
    } catch {
      // body opcional se veio via query
    }
  }

  let parsed;
  try {
    parsed = AddItemSchema.parse({ ticker: rawTicker });
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
      data: { watchlistId: watchlist.id, ticker },
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
