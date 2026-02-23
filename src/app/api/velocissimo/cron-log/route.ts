import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const last = await prisma.cronVelocissimoLog.findFirst({
    orderBy: { runAt: "desc" },
  });
  return NextResponse.json(last);
}
