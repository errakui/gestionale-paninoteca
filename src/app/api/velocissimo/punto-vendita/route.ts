import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Per script esterni (es. GitHub Actions): con x-api-key restituisce il primo punto vendita attivo. */
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.INCASSI_API_KEY) {
    return NextResponse.json({ error: "x-api-key richiesta" }, { status: 401 });
  }
  const pv = await prisma.puntoVendita.findFirst({
    where: { attivo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
  if (!pv) return NextResponse.json({ error: "Nessun punto vendita attivo" }, { status: 404 });
  return NextResponse.json(pv);
}
