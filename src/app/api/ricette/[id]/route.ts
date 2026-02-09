import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  // Aggiorna ricetta e ricrea ingredienti
  await prisma.ricettaIngrediente.deleteMany({
    where: { ricettaId: params.id },
  });

  const ricetta = await prisma.ricetta.update({
    where: { id: params.id },
    data: {
      nome: body.nome,
      descrizione: body.descrizione || null,
      prezzo: parseFloat(body.prezzo) || 0,
      attiva: body.attiva ?? true,
      ingredienti: {
        create: (body.ingredienti || []).map(
          (ing: { prodottoId: string; quantita: number }) => ({
            prodottoId: ing.prodottoId,
            quantita: ing.quantita,
          })
        ),
      },
    },
    include: {
      ingredienti: { include: { prodotto: true } },
    },
  });

  return NextResponse.json(ricetta);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.ricetta.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
