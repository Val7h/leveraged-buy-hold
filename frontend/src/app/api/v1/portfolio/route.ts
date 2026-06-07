import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const PortfolioCreateSchema = z.object({
  name: z.string().min(1).max(120),
  initialEquity: z.number().nonnegative(),
  monthlyContribution: z.number().nonnegative().default(0),
  currency: z.string().min(3).max(8).default("BRL"),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const portfolios = await prisma.portfolio.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { positions: true } } },
  });

  return NextResponse.json(portfolios);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = PortfolioCreateSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_payload", details: (err as z.ZodError).issues ?? null },
      { status: 400 }
    );
  }

  const created = await prisma.portfolio.create({
    data: {
      userId: user.id, // NEVER from body — always from session.
      name: parsed.name,
      initialEquity: parsed.initialEquity,
      monthlyContribution: parsed.monthlyContribution,
      currency: parsed.currency,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
