import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseData(testo: string | null): string | null {
  if (!testo || typeof testo !== "string") return null;
  const s = testo.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const it = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(s);
  if (it) return `${it[3]}-${it[2].padStart(2, "0")}-${it[1].padStart(2, "0")}`;
  return null;
}

function parseImporto(testo: string | null): number {
  if (testo == null || testo === "") return NaN;
  const s = String(testo).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(s);
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "");
  const cronOk = process.env.CRON_SECRET ? secret === process.env.CRON_SECRET : true;
  const token = req.cookies.get("auth-token")?.value;
  const userOk = token && verifyToken(token);
  if (!cronOk && !userOk) {
    return NextResponse.json({ error: "Non autorizzato (cron secret o login richiesto)" }, { status: 401 });
  }

  const wantScreenshots = req.headers.get("x-want-screenshots") === "1" && !!userOk;
  type Step = { step: string; ok: boolean; detail?: string; screenshot?: string };
  const steps: Step[] = [];
  const add = (step: string, ok: boolean, detail?: string, screenshot?: string) => {
    steps.push({ step, ok, detail, ...(screenshot ? { screenshot } : {}) });
  };
  const capture = async (p: { screenshot(arg?: { type: "jpeg"; quality: number; encoding: "base64" }): Promise<string> }) => {
    if (!wantScreenshots) return undefined;
    try {
      return await p.screenshot({ type: "jpeg", quality: 80, encoding: "base64" });
    } catch {
      return undefined;
    }
  };

  const email = process.env.VELOCISSIMO_EMAIL;
  const password = process.env.VELOCISSIMO_PASSWORD;
  const apiKey = process.env.INCASSI_API_KEY;

  if (!email || !password || !apiKey) {
    add("Variabili ambiente (EMAIL, PASSWORD, INCASSI_API_KEY)", false, "Mancanti in Vercel");
    await prisma.cronVelocissimoLog.create({ data: { status: "ERROR", message: "Variabili Vercel mancanti" } }).catch(() => {});
    return NextResponse.json({ error: "Variabili mancanti", steps }, { status: 500 });
  }
  add("Variabili ambiente", true);

  const pv = await prisma.puntoVendita.findFirst({
    where: { attivo: true },
    orderBy: { nome: "asc" },
  });
  const puntoVenditaId = pv?.id;
  if (!puntoVenditaId) {
    add("Punto vendita attivo", false, "Nessuno nel gestionale");
    await prisma.cronVelocissimoLog.create({ data: { status: "ERROR", message: "Nessun punto vendita attivo" } }).catch(() => {});
    return NextResponse.json({ error: "Nessun punto vendita attivo", steps }, { status: 500 });
  }
  add("Punto vendita attivo", true, pv.nome);

  const isVercel = !!process.env.VERCEL;

  // Su Vercel Chrome non può girare: mancano libnss3/libnspr4. Lo sync va fatto da GitHub Actions.
  if (isVercel) {
    add(
      "Sync su Vercel",
      false,
      "Chrome non disponibile su Vercel (librerie di sistema mancanti). Usa GitHub Actions: repo → .github/workflows/sync-velocissimo.yml. Aggiungi i secrets e il workflow gira ogni 6 min."
    );
    await prisma.cronVelocissimoLog.create({
      data: { status: "ERROR", message: "Sync da eseguire con GitHub Actions (vedi .github/workflows)" },
    }).catch(() => {});
    return NextResponse.json(
      {
        ok: false,
        message: "Su Vercel non è possibile usare Chrome. Configura GitHub Actions (vedi .github/workflows/sync-velocissimo.yml e docs/sync-velocissimo-github-actions.md).",
        steps,
        useGitHubActions: true,
      },
      { status: 200 }
    );
  }

  let browser;
  try {
    const exePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: exePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  } catch (e) {
    add("Avvio browser (solo in locale)", false, String(e));
    await prisma.cronVelocissimoLog.create({ data: { status: "ERROR", message: String(e) } }).catch(() => {});
    return NextResponse.json({ error: "Browser launch failed", steps }, { status: 500 });
  }
  add("Browser avviato", true);

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");

    await page.goto("https://admin.velocissimo.app", { waitUntil: "networkidle2", timeout: 25000 });
    add("Pagina admin.velocissimo.app caricata", true, undefined, await capture(page));

    const selUser = "input[type='email'], input[name='email']";
    const selPass = "input[type='password'], input[name='password']";
    await page.waitForSelector(selUser, { timeout: 10000 });
    await page.type(selUser, email, { delay: 30 });
    await page.type(selPass, password, { delay: 30 });
    await page.click("button[type='submit']").catch(() => page.click("button"));
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));
    add("Login (email/password inviati, submit)", true, undefined, await capture(page));

    const sedeDaCercare = (process.env.VELOCISSIMO_SEDE || "Sorrento").trim();
    const elementiCliccabili = await page.evaluate(() => {
      const out: string[] = [];
      const seen = new Set<string>();
      for (const sel of ["a", "button", "[role='button']", "[onclick]"]) {
        document.querySelectorAll(sel).forEach((el) => {
          const t = (el as HTMLElement).textContent?.trim().slice(0, 80);
          if (t && !seen.has(t)) {
            seen.add(t);
            out.push(t);
          }
        });
      }
      return out;
    }).catch(() => []);
    const listaTesti = elementiCliccabili.length ? elementiCliccabili.join(" | ") : "nessun elemento";
    add("Cosa vedo in pagina (testi cliccabili)", true, listaTesti);
    add("Sede da selezionare (env VELOCISSIMO_SEDE)", true, sedeDaCercare || "(imposta in Vercel)");

    const clickedSede = await page.evaluate((text: string) => {
      if (!text) return false;
      const selectors = ["nav a", "header a", "[class*='menu'] a", "a", "button", "span", "div"];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.textContent && el.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
            (el as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    }, sedeDaCercare);
    if (clickedSede) await new Promise((r) => setTimeout(r, 3000));
    add("Clic su sede \"" + sedeDaCercare + "\"", clickedSede, clickedSede ? undefined : "Non trovato: verifica VELOCISSIMO_SEDE e i testi sopra", await capture(page));

    const tabelleInfo = await page.evaluate(() => {
      const tables = document.querySelectorAll("table");
      return Array.from(tables).map((t, i) => {
        const rows = t.querySelectorAll("tbody tr");
        const header = t.querySelector("thead tr");
        const cols = header ? Array.from(header.querySelectorAll("th, td")).map((c) => c.textContent?.trim() ?? "") : [];
        const primaRiga = rows[0] ? Array.from(rows[0].querySelectorAll("td, th")).map((c) => (c.textContent?.trim() ?? "").slice(0, 30)) : [];
        return { righe: rows.length, colonne: cols, primaRiga };
      });
    }).catch(() => []);
    const tabelleDesc = tabelleInfo.length
      ? tabelleInfo.map((t, i) => `Tabella ${i + 1}: ${t.righe} righe, colonne: [${t.colonne.join(", ")}], prima riga: [${t.primaRiga.join(", ")}]`).join("; ")
      : "nessuna tabella tbody trovata";
    add("Tabelle trovate (cosa vedo)", true, tabelleDesc, await capture(page));

    const righe = await page.$$eval(
      "table tbody tr, .table tbody tr",
      (rows) => {
        return rows.map((row) => {
          const cells = row.querySelectorAll("td");
          const data = cells[0]?.textContent?.trim() ?? "";
          const importo = cells[1]?.textContent?.trim() ?? (cells[2]?.textContent?.trim() ?? "");
          return { data, importo };
        });
      }
    ).catch(() => []);
    add("Tabella incassi letta", true, `${righe.length} righe estratte`);

    const incassi: { data: string; importo: number; puntoVenditaId: string }[] = [];
    for (const r of righe) {
      const data = parseData(r.data);
      const importo = parseImporto(r.importo);
      if (data && !isNaN(importo) && importo > 0) {
        incassi.push({ data, importo, puntoVenditaId });
      }
    }
    add("Dati parsati (date + importi validi)", true, `${incassi.length} incassi validi`);

    await browser.close();

    if (incassi.length === 0) {
      await prisma.cronVelocissimoLog.create({ data: { status: "OK", message: "0 incassi (tabella vuota o selettori da verificare)" } }).catch(() => {});
      return NextResponse.json({ ok: true, count: 0, message: "Nessuna riga incasso estratta", steps });
    }

    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.NEXTAUTH_URL || "http://localhost:3000");
    const res = await fetch(`${base}/api/incassi`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ incassi, fonte: "SCRAPING" }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = "API incassi: " + (body.error || res.status);
      add("Invio incassi al gestionale (POST /api/incassi)", false, msg);
      await prisma.cronVelocissimoLog.create({ data: { status: "ERROR", message: msg } }).catch(() => {});
      return NextResponse.json({ error: msg, steps }, { status: 500 });
    }
    const count = body.count ?? incassi.length;
    add("Incassi salvati nel gestionale", true, `${count} registrati`);
    await prisma.cronVelocissimoLog.create({ data: { status: "OK", message: `${count} incassi caricati` } }).catch(() => {});
    return NextResponse.json({ ok: true, count, steps });
  } catch (err) {
    add("Esecuzione script", false, String(err));
    try { await browser?.close(); } catch (_) {}
    await prisma.cronVelocissimoLog.create({ data: { status: "ERROR", message: String(err) } }).catch(() => {});
    return NextResponse.json({ error: String(err), steps }, { status: 500 });
  }
}
