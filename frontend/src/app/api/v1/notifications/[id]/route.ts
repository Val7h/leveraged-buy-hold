import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

export async function DELETE(_req: NextRequest, { params: { id } }: RouteCtx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await prisma.notification.deleteMany({
      where: { id, userId: user.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
