import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const pvId = req.nextUrl.searchParams.get("puntoVenditaId");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

  const where = pvId ? { puntoVenditaId: pvId } : {};

  const movimenti = await prisma.movimento.findMany({
    where,
    include: {
      prodotto: true,
      puntoVendita: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(movimenti);
}
