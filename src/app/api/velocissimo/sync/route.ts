import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const syncs = await prisma.syncVelocissimo.findMany({
    include: { puntoVendita: { select: { id: true, nome: true } } },
    orderBy: { ultimoSync: "desc" },
  });
  return NextResponse.json(syncs);
}
