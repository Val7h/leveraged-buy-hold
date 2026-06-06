import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([]);
}

export async function POST() {
  return NextResponse.json({ id: 1, name: "Minha Carteira", message: "Portfólio criado (modo demo)" });
}
