import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const prodotti = await prisma.prodotto.findMany({
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(prodotti);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const prodotto = await prisma.prodotto.create({
    data: {
      nome: body.nome,
      categoria: body.categoria || "ALTRO",
      unitaMisura: body.unitaMisura || "PEZZI",
      sogliaMinima: parseFloat(body.sogliaMinima) || 0,
      costoMedio: parseFloat(body.costoMedio) || 0,
    },
  });
  return NextResponse.json(prodotto, { status: 201 });
}
