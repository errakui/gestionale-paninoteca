import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const ricette = await prisma.ricetta.findMany({
    include: {
      ingredienti: {
        include: { prodotto: true },
      },
    },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(ricette);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const ricetta = await prisma.ricetta.create({
    data: {
      nome: body.nome,
      descrizione: body.descrizione || null,
      prezzo: parseFloat(body.prezzo) || 0,
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

  return NextResponse.json(ricetta, { status: 201 });
}
