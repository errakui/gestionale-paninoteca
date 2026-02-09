import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pvId = req.nextUrl.searchParams.get("puntoVenditaId");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (pvId) where.puntoVenditaId = pvId;
  if (from || to) {
    where.data = {};
    if (from) where.data.gte = new Date(from);
    if (to) where.data.lte = new Date(to);
  }

  const vendite = await prisma.vendita.findMany({
    where,
    include: {
      ricetta: true,
      puntoVendita: true,
    },
    orderBy: { data: "desc" },
    take: 200,
  });

  return NextResponse.json(vendite);
}

// POST: registra vendita e scarica ingredienti dal magazzino
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ricettaId, puntoVenditaId, quantita } = body;
  const qty = parseInt(quantita) || 1;

  // Prendi la ricetta con ingredienti
  const ricetta = await prisma.ricetta.findUnique({
    where: { id: ricettaId },
    include: { ingredienti: true },
  });

  if (!ricetta) {
    return NextResponse.json({ error: "Ricetta non trovata" }, { status: 404 });
  }

  // Crea la vendita
  const vendita = await prisma.vendita.create({
    data: {
      ricettaId,
      puntoVenditaId,
      quantita: qty,
      data: body.data ? new Date(body.data) : new Date(),
    },
    include: { ricetta: true, puntoVendita: true },
  });

  // Scarica ingredienti dal magazzino
  for (const ing of ricetta.ingredienti) {
    const delta = ing.quantita * qty;

    // Crea movimento di scarico
    await prisma.movimento.create({
      data: {
        tipo: "SCARICO",
        quantita: delta,
        prodottoId: ing.prodottoId,
        puntoVenditaId,
        note: `Vendita: ${ricetta.nome} x${qty}`,
      },
    });

    // Aggiorna giacenza
    await prisma.giacenza.upsert({
      where: {
        puntoVenditaId_prodottoId: {
          puntoVenditaId,
          prodottoId: ing.prodottoId,
        },
      },
      create: {
        puntoVenditaId,
        prodottoId: ing.prodottoId,
        quantita: 0,
      },
      update: {
        quantita: { decrement: delta },
      },
    });
  }

  return NextResponse.json(vendita, { status: 201 });
}
