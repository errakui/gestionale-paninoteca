#!/usr/bin/env node
/**
 * Sync incassi da admin.velocissimo.app → gestionale.
 * Da eseguire su GitHub Actions (Ubuntu: Chrome e lib disponibili).
 * Env obbligatori: VELOCISSIMO_EMAIL, VELOCISSIMO_PASSWORD, INCASSI_API_KEY, GESTIONALE_URL
 * Opzionale: VELOCISSIMO_SEDE (default Sorrento)
 *
 * In Actions: npm install puppeteer && node scripts/sync-velocissimo-github-actions.mjs
 */

const GESTIONALE_URL = process.env.GESTIONALE_URL?.replace(/\/$/, "") || "";
const EMAIL = process.env.VELOCISSIMO_EMAIL;
const PASSWORD = process.env.VELOCISSIMO_PASSWORD;
const API_KEY = process.env.INCASSI_API_KEY;
const SEDE = (process.env.VELOCISSIMO_SEDE || "Sorrento").trim();

function parseData(t) {
  if (!t || typeof t !== "string") return null;
  const s = t.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const it = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(s);
  if (it) return `${it[3]}-${it[2].padStart(2, "0")}-${it[1].padStart(2, "0")}`;
  return null;
}

function parseImporto(t) {
  if (t == null || t === "") return NaN;
  const s = String(t).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(s);
}

async function main() {
  if (!GESTIONALE_URL || !EMAIL || !PASSWORD || !API_KEY) {
    console.error("Imposta: GESTIONALE_URL, VELOCISSIMO_EMAIL, VELOCISSIMO_PASSWORD, INCASSI_API_KEY");
    process.exit(1);
  }

  const resPv = await fetch(`${GESTIONALE_URL}/api/velocissimo/punto-vendita`, {
    headers: { "x-api-key": API_KEY },
  });
  if (!resPv.ok) {
    console.error("Punto vendita:", resPv.status, await resPv.text());
    process.exit(1);
  }
  const { id: puntoVenditaId } = await resPv.json();

  const puppeteer = await import("puppeteer");
  let browser;
  browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
    await page.goto("https://admin.velocissimo.app", { waitUntil: "networkidle2", timeout: 25000 });

    await page.waitForSelector("input[type='email'], input[name='email']", { timeout: 10000 });
    await page.type("input[type='email'], input[name='email']", EMAIL, { delay: 30 });
    await page.type("input[type='password'], input[name='password']", PASSWORD, { delay: 30 });
    await page.click("button[type='submit']").catch(() => page.click("button"));
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));

    const clicked = await page.evaluate((text) => {
      const selectors = ["nav a", "header a", "[class*='menu'] a", "a", "button", "span", "div"];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.textContent && el.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
            el.click();
            return true;
          }
        }
      }
      return false;
    }, SEDE);
    if (clicked) await new Promise((r) => setTimeout(r, 3000));

    const righe = await page.$$eval("table tbody tr, .table tbody tr", (rows) =>
      rows.map((row) => {
        const cells = row.querySelectorAll("td");
        const data = cells[0]?.textContent?.trim() ?? "";
        const importo = cells[1]?.textContent?.trim() ?? (cells[2]?.textContent?.trim() ?? "");
        return { data, importo };
      })
    );

    const incassi = [];
    for (const r of righe) {
      const data = parseData(r.data);
      const importo = parseImporto(r.importo);
      if (data && !isNaN(importo) && importo > 0) {
        incassi.push({ data, importo, puntoVenditaId });
      }
    }

    if (incassi.length === 0) {
      console.log("0 incassi estratti (tabella vuota o selettori da verificare)");
      return;
    }

    const res = await fetch(`${GESTIONALE_URL}/api/incassi`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ incassi, fonte: "SCRAPING" }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("API incassi:", res.status, body);
      process.exit(1);
    }
    console.log("Ok:", body.count ?? incassi.length, "incassi caricati");
  } finally {
    await browser?.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
