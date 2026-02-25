import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function cleanKey(v: string | null | undefined): string {
  return (v || "").replace(/\\n/g, "").replace(/\\r/g, "").replace(/\r?\n/g, "").trim();
}

/** Per script esterni (es. GitHub Actions): con x-api-key restituisce il primo punto vendita attivo. */
export async function GET(req: NextRequest) {
  const apiKey = cleanKey(req.headers.get("x-api-key"));
  const expected = cleanKey(process.env.INCASSI_API_KEY);
  if (!apiKey || !expected || apiKey !== expected) {
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
