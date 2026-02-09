import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const pv = await prisma.puntoVendita.update({
    where: { id: params.id },
    data: {
      nome: body.nome,
      indirizzo: body.indirizzo || null,
      telefono: body.telefono || null,
      attivo: body.attivo,
    },
  });
  return NextResponse.json(pv);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.puntoVendita.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
