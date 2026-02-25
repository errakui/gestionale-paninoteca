import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function cleanKey(v: string | null | undefined): string {
  return (v || "").replace(/\\n/g, "").replace(/\\r/g, "").replace(/\r?\n/g, "").trim();
}

function normDay(input?: string): Date {
  const d = input ? new Date(input) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function mkKey(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v)).sort().join("|");
  if (value == null) return "";
  return String(value);
}

export async function GET(req: NextRequest) {
  const day = req.nextUrl.searchParams.get("day");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const storeValue = req.nextUrl.searchParams.get("storeValue");
  const originsKey = req.nextUrl.searchParams.get("originsKey");
  const typesKey = req.nextUrl.searchParams.get("typesKey");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10", 10) || 10, 50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (day) where.day = normDay(day);
  if (from || to) {
    where.day = {};
    if (from) where.day.gte = normDay(from);
    if (to) where.day.lte = normDay(to);
  }
  if (storeValue) where.storeValue = storeValue;
  if (originsKey != null) where.originsKey = originsKey;
  if (typesKey != null) where.typesKey = typesKey;

  const rows = await prisma.velocissimoAnalyticsCache.findMany({
    where,
    orderBy: [{ day: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const apiKey = cleanKey(req.headers.get("x-api-key"));
  const expected = cleanKey(process.env.INCASSI_API_KEY);
  if (!apiKey || !expected || apiKey !== expected) {
    return NextResponse.json({ error: "x-api-key richiesta" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const day = normDay(body.day);
  const storeValue = String(body.storeValue ?? "-1");
  const storeText = body.storeText != null ? String(body.storeText) : null;
  const origins = body.origins ?? [];
  const types = body.types ?? [];
  const metrics = body.metrics ?? {};
  const raw = body.raw ?? null;

  const originsKey = mkKey(origins);
  const typesKey = mkKey(types);

  const row = await prisma.velocissimoAnalyticsCache.upsert({
    where: {
      day_storeValue_originsKey_typesKey: {
        day,
        storeValue,
        originsKey,
        typesKey,
      },
    },
    create: {
      day,
      storeValue,
      storeText,
      originsKey,
      typesKey,
      origins,
      types,
      metrics,
      raw,
    },
    update: {
      storeText,
      origins,
      types,
      metrics,
      raw,
    },
  });

  return NextResponse.json({ ok: true, id: row.id });
}

