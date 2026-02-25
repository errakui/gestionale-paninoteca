import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function cleanKey(v: string | null | undefined): string {
  return (v || "").replace(/\\n/g, "").replace(/\\r/g, "").replace(/\r?\n/g, "").trim();
}

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

  const incassi = await prisma.incassoGiornaliero.findMany({
    where,
    include: { puntoVendita: true },
    orderBy: { data: "desc" },
    take: 500,
  });

  return NextResponse.json(incassi);
}

export async function POST(req: NextRequest) {
  const apiKey = cleanKey(req.headers.get("x-api-key"));
  const expected = cleanKey(process.env.INCASSI_API_KEY);
  const hasUserSession = Boolean(req.cookies.get("auth-token")?.value);
  const isApiKeyValid = Boolean(apiKey && expected && apiKey === expected);
  if (!isApiKeyValid && !hasUserSession) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await req.json();

  // Import multiplo da array (usabile da script scraping o da UI)
  if (Array.isArray(body.incassi)) {
    const created: { data: string; puntoVenditaId: string; importo: number }[] = [];
    const fonte = body.fonte || "IMPORT";

    for (const row of body.incassi) {
      const data = row.data ? new Date(row.data) : new Date();
      const dataNorm = new Date(data.getFullYear(), data.getMonth(), data.getDate());
      const importo = parseFloat(row.importo);
      if (!row.puntoVenditaId || isNaN(importo)) continue;

      await prisma.incassoGiornaliero.upsert({
        where: {
          data_puntoVenditaId: {
            data: dataNorm,
            puntoVenditaId: row.puntoVenditaId,
          },
        },
        create: {
          data: dataNorm,
          importo,
          fonte: fonte as "MANUALE" | "IMPORT" | "SCRAPING",
          note: row.note || null,
          puntoVenditaId: row.puntoVenditaId,
        },
        update: {
          importo,
          note: row.note || undefined,
          fonte: fonte as "MANUALE" | "IMPORT" | "SCRAPING",
        },
      });
      created.push({ data: dataNorm.toISOString(), puntoVenditaId: row.puntoVenditaId, importo });
    }
    // Aggiorna ultimo sync Velocissimo per ogni PV (per pagina dedicata)
    if (fonte === "SCRAPING") {
      const perPv = created.reduce((acc, i) => {
        acc[i.puntoVenditaId] = (acc[i.puntoVenditaId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      for (const pvId of Object.keys(perPv)) {
        await prisma.syncVelocissimo.upsert({
          where: { puntoVenditaId: pvId },
          create: { puntoVenditaId: pvId, ultimoSync: new Date(), ultimiCount: perPv[pvId] },
          update: { ultimoSync: new Date(), ultimiCount: perPv[pvId] },
        });
      }
    }
    return NextResponse.json({ ok: true, count: created.length, incassi: created }, { status: 201 });
  }

  // Singolo incasso
  const { data, importo, puntoVenditaId, fonte, note } = body;
  const dataNorm = data ? new Date(new Date(data).setHours(0, 0, 0, 0)) : new Date();
  const amount = parseFloat(importo);
  if (!puntoVenditaId || isNaN(amount)) {
    return NextResponse.json({ error: "puntoVenditaId e importo obbligatori" }, { status: 400 });
  }

  const incasso = await prisma.incassoGiornaliero.upsert({
    where: {
      data_puntoVenditaId: {
        data: dataNorm,
        puntoVenditaId,
      },
    },
    create: {
      data: dataNorm,
      importo: amount,
      fonte: (fonte || "MANUALE") as "MANUALE" | "IMPORT" | "SCRAPING",
      note: note || null,
      puntoVenditaId,
    },
    update: {
      importo: amount,
      note: note ?? undefined,
      fonte: (fonte || "MANUALE") as "MANUALE" | "IMPORT" | "SCRAPING",
    },
    include: { puntoVendita: true },
  });

  return NextResponse.json(incasso, { status: 201 });
}
