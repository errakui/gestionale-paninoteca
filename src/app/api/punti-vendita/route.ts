import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const puntiVendita = await prisma.puntoVendita.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { giacenze: true, vendite: true } } },
  });
  return NextResponse.json(puntiVendita);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pv = await prisma.puntoVendita.create({
    data: {
      nome: body.nome,
      indirizzo: body.indirizzo || null,
      telefono: body.telefono || null,
    },
  });
  return NextResponse.json(pv, { status: 201 });
}
