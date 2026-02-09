import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET giacenze per punto vendita
export async function GET(req: NextRequest) {
  const pvId = req.nextUrl.searchParams.get("puntoVenditaId");

  const where = pvId ? { puntoVenditaId: pvId } : {};

  const giacenze = await prisma.giacenza.findMany({
    where,
    include: {
      prodotto: true,
      puntoVendita: true,
    },
    orderBy: { prodotto: { nome: "asc" } },
  });

  return NextResponse.json(giacenze);
}

// POST: registra movimento (carico/scarico) e aggiorna giacenza
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tipo, quantita, prodottoId, puntoVenditaId, note } = body;

  const qty = parseFloat(quantita);

  // Crea movimento
  const movimento = await prisma.movimento.create({
    data: {
      tipo,
      quantita: qty,
      prodottoId,
      puntoVenditaId,
      note: note || null,
    },
  });

  // Aggiorna o crea giacenza
  const delta = tipo === "CARICO" ? qty : -qty;

  await prisma.giacenza.upsert({
    where: {
      puntoVenditaId_prodottoId: { puntoVenditaId, prodottoId },
    },
    create: {
      puntoVenditaId,
      prodottoId,
      quantita: Math.max(0, delta),
    },
    update: {
      quantita: { increment: delta },
    },
  });

  return NextResponse.json(movimento, { status: 201 });
}
