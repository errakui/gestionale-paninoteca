import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const [
    totPuntiVendita,
    totProdotti,
    totRicette,
    giacenze,
    venditeOggi,
    movimentiRecenti,
    venditeSettimanali,
  ] = await Promise.all([
    prisma.puntoVendita.count({ where: { attivo: true } }),
    prisma.prodotto.count(),
    prisma.ricetta.count({ where: { attiva: true } }),
    prisma.giacenza.findMany({
      include: { prodotto: true, puntoVendita: true },
    }),
    prisma.vendita.count({
      where: {
        data: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.movimento.findMany({
      include: { prodotto: true, puntoVendita: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.vendita.findMany({
      where: {
        data: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: { ricetta: true, puntoVendita: true },
    }),
  ]);

  // Prodotti sotto soglia
  const sottoSoglia = giacenze.filter(
    (g) => g.quantita <= g.prodotto.sogliaMinima && g.prodotto.sogliaMinima > 0
  );

  // Vendite per punto vendita (ultimi 7 giorni)
  const venditePerPV: Record<string, number> = {};
  for (const v of venditeSettimanali) {
    const nome = v.puntoVendita.nome;
    venditePerPV[nome] = (venditePerPV[nome] || 0) + v.quantita;
  }

  // Top ricette vendute
  const ricetteCount: Record<string, { nome: string; count: number }> = {};
  for (const v of venditeSettimanali) {
    const id = v.ricettaId;
    if (!ricetteCount[id]) ricetteCount[id] = { nome: v.ricetta.nome, count: 0 };
    ricetteCount[id].count += v.quantita;
  }
  const topRicette = Object.values(ricetteCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return NextResponse.json({
    stats: {
      puntiVendita: totPuntiVendita,
      prodotti: totProdotti,
      ricette: totRicette,
      venditeOggi,
    },
    sottoSoglia: sottoSoglia.map((g) => ({
      prodotto: g.prodotto.nome,
      puntoVendita: g.puntoVendita.nome,
      quantita: g.quantita,
      soglia: g.prodotto.sogliaMinima,
      unita: g.prodotto.unitaMisura,
    })),
    venditePerPV: Object.entries(venditePerPV).map(([nome, count]) => ({
      nome,
      vendite: count,
    })),
    topRicette,
    movimentiRecenti: movimentiRecenti.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      quantita: m.quantita,
      prodotto: m.prodotto.nome,
      puntoVendita: m.puntoVendita.nome,
      data: m.createdAt,
      note: m.note,
    })),
  });
}
