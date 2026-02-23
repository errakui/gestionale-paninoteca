/**
 * Script di scraping incassi: login sul portale esterno, estrazione tabella, invio a POST /api/incassi.
 * Configura .env e config.json (copia da config.example.json).
 *
 * Uso: cd scripts/scrape-incassi && npm install && npm run scrape
 */

import "dotenv/config";
import puppeteer from "puppeteer";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  const path = join(__dirname, "config.json");
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (e) {
    console.error("Crea config.json (copia da config.example.json) e compila URL e selettori.");
    process.exit(1);
  }
}

function parseData(testo) {
  if (!testo || typeof testo !== "string") return null;
  const s = testo.trim();
  // yyyy-mm-dd
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // dd/mm/yyyy o dd-mm-yyyy
  const it = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(s);
  if (it) return `${it[3]}-${it[2].padStart(2, "0")}-${it[1].padStart(2, "0")}`;
  return null;
}

function parseImporto(testo) {
  if (testo == null || testo === "") return NaN;
  const s = String(testo).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(s);
}

async function main() {
  const config = loadConfig();
  const {
    PORTALE_USER,
    PORTALE_PASSWORD,
    INCASSI_API_KEY,
  } = process.env;

  if (!PORTALE_USER || !PORTALE_PASSWORD) {
    console.error("Imposta PORTALE_USER e PORTALE_PASSWORD in .env");
    process.exit(1);
  }
  if (!INCASSI_API_KEY) {
    console.error("Imposta INCASSI_API_KEY in .env (stessa chiave del gestionale)");
    process.exit(1);
  }

  const puntoVenditaId = config.gestionale?.puntoVenditaId || process.env.PUNTO_VENDITA_ID;
  if (!puntoVenditaId) {
    console.error("Imposta gestionale.puntoVenditaId in config.json oppure PUNTO_VENDITA_ID in .env");
    process.exit(1);
  }

  const loginUrl = config.portale?.loginUrl || process.env.PORTALE_LOGIN_URL;
  const incassiUrl = config.portale?.incassiUrl || process.env.PORTALE_INCASSI_URL;
  if (!loginUrl || !incassiUrl) {
    console.error("Imposta portale.loginUrl e portale.incassiUrl in config.json");
    process.exit(1);
  }

  const sel = config.portale?.selectors || {};
  const headless = process.env.HEADLESS !== "false";

  console.log("Avvio browser...");
  const browser = await puppeteer.launch({
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    console.log("Login su", loginUrl);
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30000 });

    const selUser = sel.username || "input[name='email'], #username, #email";
    const selPass = sel.password || "input[name='password'], #password";
    const selSubmit = sel.submit || "button[type='submit']";

    await page.waitForSelector(selUser.split(",")[0].trim(), { timeout: 10000 });
    await page.type(selUser.split(",")[0].trim(), PORTALE_USER, { delay: 50 });
    await page.type(selPass.split(",")[0].trim(), PORTALE_PASSWORD, { delay: 50 });
    await page.click(selSubmit.split(",")[0].trim());
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});

    const waitAfter = config.portale?.waitAfterLoginMs ?? 2000;
    await new Promise((r) => setTimeout(r, waitAfter));

    // Velocissimo: seleziona sede (es. Sorrento) dal menu in alto a destra
    const sorrentoText = config.portale?.sorrentoMenuText;
    if (sorrentoText) {
      console.log("Selezione sede:", sorrentoText);
      const clicked = await page.evaluate((text) => {
        const els = document.querySelectorAll("a, button, [role='button'], .dropdown-item, [data-sede], span");
        for (const el of els) {
          if (el.textContent && el.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
            el.click();
            return true;
          }
        }
        return false;
      }, sorrentoText);
      if (clicked) await new Promise((r) => setTimeout(r, 2500));
    }

    if (!sorrentoText || incassiUrl !== loginUrl) {
      console.log("Apertura pagina incassi:", incassiUrl);
      await page.goto(incassiUrl, { waitUntil: "networkidle2", timeout: 30000 });
    }
    const waitTable = config.portale?.waitForTableMs ?? 3000;
    await new Promise((r) => setTimeout(r, waitTable));

    const rowsSelector = (sel.rows || "table tbody tr").split(",")[0].trim();
    const dataSelector = (sel.data || "td:nth-child(1)").split(",")[0].trim();
    const importoSelector = (sel.importo || "td:nth-child(2)").split(",")[0].trim();

    const righe = await page.$$eval(rowsSelector, (rows, opts) => {
      const result = [];
      for (const row of rows) {
        try {
          const dataEl = row.querySelector(opts.data);
          const importoEl = row.querySelector(opts.importo);
          const data = dataEl ? dataEl.textContent : "";
          const importo = importoEl ? importoEl.textContent : "";
          if (data || importo) result.push({ data, importo });
        } catch (_) {}
      }
      return result;
    }, { data: dataSelector, importo: importoSelector });

    const incassi = [];
    for (const r of righe) {
      const data = parseData(r.data);
      const importo = parseImporto(r.importo);
      if (data && !isNaN(importo) && importo > 0) {
        incassi.push({ data, importo, puntoVenditaId });
      }
    }

    console.log("Righe estratte:", righe.length, "→ Incassi validi:", incassi.length);
    if (incassi.length === 0) {
      console.log("Nessun incasso da inviare. Verifica i selettori in config.json (rows, data, importo).");
      await browser.close();
      return;
    }

    const apiUrl = (config.gestionale?.apiUrl || process.env.GESTIONALE_API_URL || "http://localhost:3000").replace(/\/$/, "");
    const url = `${apiUrl}/api/incassi`;
    console.log("Invio a", url, "...");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": INCASSI_API_KEY,
      },
      body: JSON.stringify({ incassi, fonte: "SCRAPING" }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Errore API:", res.status, body);
      process.exit(1);
    }
    console.log("OK:", body.count ?? body, "incassi caricati.");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
