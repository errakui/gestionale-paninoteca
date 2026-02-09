import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const prodotto = await prisma.prodotto.update({
    where: { id: params.id },
    data: {
      nome: body.nome,
      categoria: body.categoria,
      unitaMisura: body.unitaMisura,
      sogliaMinima: parseFloat(body.sogliaMinima) || 0,
      costoMedio: parseFloat(body.costoMedio) || 0,
    },
  });
  return NextResponse.json(prodotto);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.prodotto.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
