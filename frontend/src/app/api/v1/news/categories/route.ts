import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = ["Mercado", "Empresas", "Internacional", "Commodities", "Criptoativos"];

export async function GET() {
  return NextResponse.json({ categories: CATEGORIES });
}
