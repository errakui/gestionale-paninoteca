#!/usr/bin/env node
/**
 * Sync incassi da admin.velocissimo.app → gestionale.
 * Stesso script in locale e su GitHub Actions: se lo perfezioni in locale, funziona anche nel cloud.
 *
 * Env obbligatori: VELOCISSIMO_EMAIL, VELOCISSIMO_PASSWORD, INCASSI_API_KEY, GESTIONALE_URL
 * Opzionale: VELOCISSIMO_SEDE (default Sorrento)
 * Debug: DEBUG=1 stampa ogni passaggio e "cosa vedo" in pagina (utile per rifinire selettori).
 * Locale con browser visibile: HEADLESS=false (solo in locale, non su Actions).
 */

const GESTIONALE_URL = (process.env.GESTIONALE_URL || "").replace(/\/$/, "").trim();
const cleanEnv = (v) =>
  (v || "")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "")
    .replace(/\r?\n/g, "")
    .trim();

const EMAIL = cleanEnv(process.env.VELOCISSIMO_EMAIL);
const PASSWORD = cleanEnv(process.env.VELOCISSIMO_PASSWORD);
const API_KEY = cleanEnv(process.env.INCASSI_API_KEY);
const SEDE = (process.env.VELOCISSIMO_SEDE || "Sorrento").trim();
const DEBUG = process.env.DEBUG === "1" || process.env.DEBUG === "true";
const HEADLESS = process.env.HEADLESS !== "false";
const STOP_AFTER_LOGIN = process.env.STOP_AFTER_LOGIN === "1";
const STOP_BEFORE_POST = process.env.STOP_BEFORE_POST === "1";
const EXPLORE_FILTERS = process.env.EXPLORE_FILTERS === "1";
const ANALYZE_DASHBOARD = process.env.ANALYZE_DASHBOARD === "1";
const PAUSE_AFTER_LOGIN_SECONDS = Number(process.env.PAUSE_AFTER_LOGIN_SECONDS || "0");
const STORE_VALUE = (process.env.VELOCISSIMO_STORE_VALUE || "-1").trim(); // dashboard: -1=Globale, 5=Sorrento
const ORIGINE_TEXT = (process.env.VELOCISSIMO_ORIGINE_TEXT || "").trim(); // es: Deliveroo / JustEat / ecc.
const TIPO_TEXT = (process.env.VELOCISSIMO_TIPO_TEXT || "").trim(); // es: Consegna / Asporto / ecc.
const BACKFILL_FROM = cleanEnv(process.env.BACKFILL_FROM); // es: 2026-02-01
const BACKFILL_TO = cleanEnv(process.env.BACKFILL_TO); // es: 2026-02-28
const BACKFILL_WRITE_INCASSI = process.env.BACKFILL_WRITE_INCASSI === "1";

function log(...args) {
  console.log("[sync]", ...args);
}

async function dumpPageContext(page, tag = "debug") {
  try {
    const fs = await import("fs");
    const dir = "tmp";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const shot = `${dir}/velocissimo-${tag}.png`;
    await page.screenshot({ path: shot, fullPage: true });
    log("Screenshot salvato:", shot);
  } catch {}
  try {
    const ctx = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input")).map((i) => ({
        type: i.getAttribute("type"),
        name: i.getAttribute("name"),
        id: i.getAttribute("id"),
        placeholder: i.getAttribute("placeholder"),
      }));
      const buttons = Array.from(document.querySelectorAll("button, a")).map((b) => ({
        tag: b.tagName.toLowerCase(),
        text: (b.textContent || "").trim().slice(0, 80),
        href: b.getAttribute("href"),
      })).filter((b) => b.text);
      return { url: location.href, title: document.title, inputs, buttons: buttons.slice(0, 20) };
    });
    log("Contesto pagina:", JSON.stringify(ctx));
  } catch {}
}

function uniq(list) {
  return [...new Set(list.filter(Boolean))];
}

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

function dayStrings(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return dayInfoFromDate(d);
}

function dayInfoFromDate(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return {
    date: `${y}-${m}-${day}`,
    start: `${y}-${m}-${day} 00:00:00`,
    end: `${y}-${m}-${day} 23:59:59`,
  };
}

function enumerateDays(fromIso, toIso) {
  const start = new Date(fromIso);
  const end = new Date(toIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
  const out = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    out.push(dayInfoFromDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

async function saveAnalyticsSnapshot(day, storeValue, storeText, selectedOrigins, selectedTypes, metrics, technicalFilters) {
  const payload = {
    day,
    storeValue,
    storeText,
    origins: selectedOrigins,
    types: selectedTypes,
    metrics,
    raw: { technicalFilters },
  };
  return postJson(`${GESTIONALE_URL}/api/velocissimo/analytics-cache`, API_KEY, payload);
}

function parseMetricToAmount(v) {
  return parseImporto(v);
}

function parseKpiResponse(raw) {
  if (!raw) return { current: null, previous: null, delta: null, sign: null };
  try {
    const j = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      current: j.current_period_value ?? null,
      previous: j.previous_period_value ?? null,
      delta: j.increment_percentage ?? null,
      sign: j.increment_sign ?? null,
    };
  } catch {
    return { current: String(raw), previous: null, delta: null, sign: null };
  }
}

async function postJson(url, apiKey, payload) {
  const { request } = await import("node:https");
  const data = Buffer.from(JSON.stringify(payload), "utf8");
  const send = async (targetUrl, depth = 0) =>
    new Promise((resolve, reject) => {
      const target = new URL(targetUrl);
      const req = request(
        {
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port || 443,
          path: `${target.pathname}${target.search}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": data.byteLength,
            "x-api-key": apiKey,
          },
        },
        async (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", async () => {
            const status = res.statusCode || 0;
            const location = res.headers.location;
            if (status >= 300 && status < 400 && location && depth < 2) {
              try {
                const nextUrl = new URL(location, target).toString();
                resolve(await send(nextUrl, depth + 1));
                return;
              } catch (e) {
                reject(e);
                return;
              }
            }
            resolve({ status, ok: status >= 200 && status < 300, body });
          });
        }
      );
      req.on("error", reject);
      req.write(data);
      req.end();
    });
  return send(url, 0);
}

async function main() {
  if (!GESTIONALE_URL || !EMAIL || !PASSWORD || !API_KEY) {
    console.error("Imposta: GESTIONALE_URL, VELOCISSIMO_EMAIL, VELOCISSIMO_PASSWORD, INCASSI_API_KEY");
    process.exit(1);
  }

  let puntoVenditaId = process.env.PUNTO_VENDITA_ID || "";
  if (!STOP_AFTER_LOGIN && !STOP_BEFORE_POST && !EXPLORE_FILTERS && !ANALYZE_DASHBOARD) {
    log("Punto vendita da gestionale...");
    const resPv = await fetch(`${GESTIONALE_URL}/api/velocissimo/punto-vendita`, {
      headers: { "x-api-key": API_KEY },
    });
    if (!resPv.ok) {
      console.error("Punto vendita:", resPv.status, await resPv.text());
      process.exit(1);
    }
    const pvData = await resPv.json();
    puntoVenditaId = pvData.id;
    log("Punto vendita:", pvData.nome, puntoVenditaId);
  } else {
    log("STOP mode: salto controllo punto vendita");
  }

  const puppeteer = await import("puppeteer");
  let browser;
  browser = await puppeteer.default.launch({
    headless: HEADLESS,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  log("Browser avviato, headless:", HEADLESS);

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
    log("Pagina admin.velocissimo.app...");
    await page.goto("https://admin.velocissimo.app", { waitUntil: "networkidle2", timeout: 25000 });
    log("Pagina caricata");

    const selUser = "input[type='email'], input[name='email'], input[name='customers_email_address'], #customers_email_address";
    const selPass = "input[type='password'], input[name='password'], #password";
    try {
      await page.waitForSelector(selUser, { timeout: 10000 });
    } catch (e) {
      await dumpPageContext(page, "login-not-found");
      throw e;
    }
    await page.type(selUser, EMAIL, { delay: 30 });
    await page.type(selPass, PASSWORD, { delay: 30 });
    await page.click("button[type='submit']").catch(() => page.click("button"));
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));
    log("Login inviato");
    if (PAUSE_AFTER_LOGIN_SECONDS > 0) {
      log(`PAUSA dopo login: ${PAUSE_AFTER_LOGIN_SECONDS}s (browser aperto per guida manuale)`);
      await new Promise((r) => setTimeout(r, PAUSE_AFTER_LOGIN_SECONDS * 1000));
    }
    if (STOP_AFTER_LOGIN) {
      log("STOP_AFTER_LOGIN=1: test apertura+login completato");
      return;
    }

    // Dashboard/homepage: qui ci sono Globale + Origini + Tipi + Aggiorna (come da screenshot)
    await page.goto("https://admin.velocissimo.app/dashboard", { waitUntil: "networkidle2", timeout: 25000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1800));

    const selectedStore = await page.evaluate((storeValue) => {
      const select = Array.from(document.querySelectorAll("select")).find((s) =>
        Array.from(s.querySelectorAll("option")).some((o) => (o.textContent || "").toLowerCase().includes("globale"))
      );
      if (!select) return { ok: false, reason: "select globale/negozio non trovato in dashboard" };
      const options = Array.from(select.querySelectorAll("option")).map((o) => ({ value: o.value, text: (o.textContent || "").trim() }));
      const option = Array.from(select.querySelectorAll("option")).find((o) => o.value === storeValue);
      if (!option) return { ok: false, reason: "valore negozio non trovato", available: options };
      select.value = storeValue;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, value: option.value, text: (option.textContent || "").trim(), available: options };
    }, STORE_VALUE);
    log("FILTRO DASHBOARD - Negozio:", JSON.stringify(selectedStore));

    const openAndPickMenu = async (buttonLabel, itemText) => {
      let clicked = false;
      try {
        clicked = await page.evaluate((txt) => {
          const candidates = Array.from(document.querySelectorAll("button, a, div, span"));
          const t = txt.toLowerCase();
          for (const el of candidates) {
            const s = (el.textContent || "").trim().toLowerCase();
            if (s && s.includes(t)) {
              el.click();
              return true;
            }
          }
          return false;
        }, buttonLabel);
      } catch {
        return { label: buttonLabel, clicked: false, options: [], picked: null };
      }
      if (!clicked) return { label: buttonLabel, clicked: false, options: [], picked: null };

      await new Promise((r) => setTimeout(r, 1000));
      const scan = await page.evaluate((wanted) => {
        const optionNodes = Array.from(
          document.querySelectorAll(
            ".dropdown-menu.show a, .dropdown-menu.show button, [role='listbox'] [role='option'], ul[role='listbox'] li, .select2-results__option, .vs__dropdown-menu li, .choices__list--dropdown .choices__item, .modal-content li, .modal-content button, .modal-content a"
          )
        );
        const options = optionNodes
          .map((n) => (n.textContent || "").trim())
          .filter(Boolean)
          .filter((v, i, arr) => arr.indexOf(v) === i);
        let picked = null;
        if (wanted) {
          const target = optionNodes.find((n) => (n.textContent || "").trim().toLowerCase() === wanted.toLowerCase());
          if (target) {
            target.click();
            picked = (target.textContent || "").trim();
          }
        }
        return { options, picked };
      }, itemText);
      return { label: buttonLabel, clicked: true, options: scan.options, picked: scan.picked };
    };

    const origini = await openAndPickMenu("tutte le origini", ORIGINE_TEXT || null);
    const tipi = await openAndPickMenu("tutti i tipi", TIPO_TEXT || null);
    log("FILTRO DASHBOARD - Origini:", JSON.stringify(origini));
    log("FILTRO DASHBOARD - Tipi:", JSON.stringify(tipi));

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button, a")).find((b) => (b.textContent || "").trim().toLowerCase().includes("aggiorna"));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 2500));
    if (DEBUG) await dumpPageContext(page, "dashboard-after-filters");

    // Salva KPI dashboard nel DB (oggi + ieri) con i filtri correnti
    if (!EXPLORE_FILTERS && !ANALYZE_DASHBOARD) {
      const technicalFilters = {
        web_order_source: "[0,1,6,7,8,9]",
        web_order_type: "[1,2,3,4,6]",
        web_order_autoconsumo: 0,
      };
      const kpiEndpoints = [
        ["new-orders", "Numero ordini"],
        ["new-orders-amount", "Totale venduto"],
        ["new-orders-average-amount", "Scontrino medio"],
        ["new-orders-net-profit", "Margine assoluto"],
        ["pax-count", "Coperti"],
        ["average-pax", "Coperto medio"],
      ];
      const fetchMetricsByDay = async (dayInfo) => {
        const out = {};
        for (const [slug, label] of kpiEndpoints) {
          const url = `/kpi/${slug}/?kpi_interval=CUSTOM&kpi_period_start=${encodeURIComponent(dayInfo.start)}&kpi_period_end=${encodeURIComponent(dayInfo.end)}&kpi_filters=${encodeURIComponent(JSON.stringify(technicalFilters))}&kpi_compare_period_type=0&`;
          const raw = await page.evaluate(async (u) => {
            const r = await fetch(u, { credentials: "include" });
            return await r.text();
          }, url);
          out[label] = parseKpiResponse(raw);
        }
        return out;
      };

      const today = dayStrings(0);
      const yesterday = dayStrings(-1);
      const metricsToday = await fetchMetricsByDay(today);
      const metricsYesterday = await fetchMetricsByDay(yesterday);

      const selectedOrigins = ORIGINE_TEXT ? [ORIGINE_TEXT] : ["Tutte le origini"];
      const selectedTypes = TIPO_TEXT ? [TIPO_TEXT] : ["Tutti i tipi"];
      const storeText = selectedStore?.text || "--Globale--";
      const storeValue = selectedStore?.value || STORE_VALUE;

      const payloads = [
        { day: today.date, metrics: metricsToday },
        { day: yesterday.date, metrics: metricsYesterday },
      ];
      for (const p of payloads) {
        const save = await saveAnalyticsSnapshot(
          p.day,
          storeValue,
          storeText,
          selectedOrigins,
          selectedTypes,
          p.metrics,
          technicalFilters
        );
        if (!save.ok) {
          log(`Salvataggio analytics cache ${p.day} fallito:`, save.status, save.body);
        } else {
          log(`Analytics cache salvata per ${p.day}`);
        }
      }

      // Backfill storico (es. febbraio): salva KPI giorno per giorno e opzionalmente incasso.
      if (BACKFILL_FROM && BACKFILL_TO) {
        const days = enumerateDays(BACKFILL_FROM, BACKFILL_TO);
        log(`BACKFILL attivo: ${BACKFILL_FROM} -> ${BACKFILL_TO} (${days.length} giorni)`);
        const incassiBackfill = [];
        for (const day of days) {
          const metrics = await fetchMetricsByDay(day);
          const save = await saveAnalyticsSnapshot(
            day.date,
            storeValue,
            storeText,
            selectedOrigins,
            selectedTypes,
            metrics,
            technicalFilters
          );
          if (!save.ok) {
            log(`Backfill analytics ${day.date} fallito:`, save.status, save.body);
          } else {
            log(`Backfill analytics ok: ${day.date}`);
          }

          const venduto = parseMetricToAmount(metrics?.["Totale venduto"]?.current);
          if (!isNaN(venduto) && venduto > 0 && puntoVenditaId) {
            incassiBackfill.push({
              data: day.date,
              importo: venduto,
              puntoVenditaId,
              note: "Backfill da KPI Totale venduto",
            });
          }
        }

        if (incassiBackfill.length > 0 && BACKFILL_WRITE_INCASSI) {
          const saveIncassi = await postJson(`${GESTIONALE_URL}/api/incassi`, API_KEY, {
            incassi: incassiBackfill,
            fonte: "SCRAPING",
          });
          if (!saveIncassi.ok) {
            log("Backfill incassi fallito:", saveIncassi.status, saveIncassi.body);
          } else {
            log(`Backfill incassi completato: ${incassiBackfill.length} giorni`);
          }
        } else if (incassiBackfill.length > 0) {
          log(
            `Backfill incassi NON eseguito (BACKFILL_WRITE_INCASSI!=1). Pronti ${incassiBackfill.length} record.`
          );
        }
      }
    }

    if (EXPLORE_FILTERS) {
      log("EXPLORE_FILTERS=1: fine analisi filtri dashboard");
      return;
    }

    if (ANALYZE_DASHBOARD) {
      log("ANALYZE_DASHBOARD=1: analisi completa dashboard (filtri + KPI)");
      await page.goto("https://admin.velocissimo.app/dashboard", { waitUntil: "networkidle2", timeout: 25000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1800));
      await dumpPageContext(page, "dashboard-analysis-start");

      const networkEvents = [];
      const onResponse = async (res) => {
        try {
          const req = res.request();
          const type = req.resourceType();
          if (type !== "xhr" && type !== "fetch") return;
          const url = res.url();
          const status = res.status();
          const ct = res.headers()["content-type"] || "";
          let preview = "";
          if (ct.includes("application/json")) {
            const txt = await res.text();
            preview = txt.slice(0, 300);
          }
          networkEvents.push({ type, status, url, preview });
        } catch {}
      };
      page.on("response", onResponse);

      const extractState = async () => page.evaluate(() => {
        const storeSelect = Array.from(document.querySelectorAll("select")).find((s) =>
          Array.from(s.querySelectorAll("option")).some((o) => (o.textContent || "").toLowerCase().includes("globale"))
        );
        const store = storeSelect
          ? {
              selectedValue: storeSelect.value,
              selectedText: (storeSelect.selectedOptions?.[0]?.textContent || "").trim(),
              options: Array.from(storeSelect.querySelectorAll("option")).map((o) => ({
                value: o.value,
                text: (o.textContent || "").trim(),
                selected: o.selected,
              })),
            }
          : null;

        const buttons = Array.from(document.querySelectorAll("button, a, span, div"))
          .map((n) => (n.textContent || "").trim())
          .filter((t) => t && t.length < 80);

        const dateInputs = Array.from(document.querySelectorAll("input"))
          .filter((i) => (i.id || "").toLowerCase().includes("date") || (i.name || "").toLowerCase().includes("date") || i.type === "date")
          .map((i) => ({ id: i.id || null, name: i.name || null, value: i.value || null, type: i.type || null }));

        const kpis = [];
        const seen = new Set();
        const nodes = document.querySelectorAll(".card, .widget, .panel, .kpi, .col, .col-md-3, .col-sm-6");
        nodes.forEach((n) => {
          const txt = (n.textContent || "").replace(/\s+/g, " ").trim();
          if (!txt || seen.has(txt)) return;
          seen.add(txt);
          const m = txt.match(/([A-Za-zÀ-ÿ][^0-9€]{2,40})\s+(-?\d[\d\.,]*\s*€?)/);
          if (m) kpis.push({ title: m[1].trim(), value: m[2].trim() });
        });

        return {
          url: location.href,
          title: document.title,
          store,
          dateInputs,
          filterButtons: buttons.filter((t) => /origini|tipi|confronta|aggiorna|globale/i.test(t)),
          kpis: kpis.slice(0, 40),
        };
      });

      const clickAndReadOptions = async (label) => {
        const clicked = await page.evaluate((txt) => {
          const t = txt.toLowerCase();
          const nodes = Array.from(document.querySelectorAll("button, a, div, span"));
          for (const n of nodes) {
            const s = (n.textContent || "").trim().toLowerCase();
            if (s && s.includes(t)) {
              n.click();
              return true;
            }
          }
          return false;
        }, label);
        if (!clicked) return { label, clicked: false, options: [] };
        await new Promise((r) => setTimeout(r, 1000));
        const options = await page.evaluate(() => {
          const out = [];
          const selectors = [
            "[role='option']",
            "ul[role='listbox'] li",
            ".dropdown-menu.show a",
            ".dropdown-menu.show button",
            ".select2-results__option",
            ".vs__dropdown-menu li",
            ".choices__list--dropdown .choices__item",
            ".modal-content li",
            ".modal-content button",
            ".menu li",
          ];
          document.querySelectorAll(selectors.join(",")).forEach((n) => {
            const t = (n.textContent || "").replace(/\s+/g, " ").trim();
            if (t && t.length <= 120) out.push(t);
          });
          return [...new Set(out)];
        });
        await page.keyboard.press("Escape").catch(() => {});
        await new Promise((r) => setTimeout(r, 250));
        return { label, clicked: true, options };
      };

      const initial = await extractState();
      const sessionValues = await page.evaluate(async () => {
        try {
          const r = await fetch("/session-values/", { credentials: "include" });
          const text = await r.text();
          try {
            return { status: r.status, json: JSON.parse(text) };
          } catch {
            return { status: r.status, text: text.slice(0, 1200) };
          }
        } catch (e) {
          return { error: String(e) };
        }
      });
      const originiMenu = await clickAndReadOptions("tutte le origini");
      const tipiMenu = await clickAndReadOptions("tutti i tipi");

      const storeRuns = [];
      const storeOptions = initial.store?.options?.filter((o) => o.value && o.value !== "Negozio") || [];
      for (const opt of storeOptions) {
        await page.evaluate((value) => {
          const s = Array.from(document.querySelectorAll("select")).find((sel) =>
            Array.from(sel.querySelectorAll("option")).some((o) => (o.textContent || "").toLowerCase().includes("globale"))
          );
          if (!s) return;
          s.value = value;
          s.dispatchEvent(new Event("change", { bubbles: true }));
        }, opt.value);
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll("button, a")).find((b) => (b.textContent || "").trim().toLowerCase().includes("aggiorna"));
          if (btn) btn.click();
        });
        await new Promise((r) => setTimeout(r, 1800));
        const state = await extractState();
        storeRuns.push({
          selected: { value: opt.value, text: opt.text },
          kpis: state.kpis,
          dateInputs: state.dateInputs,
        });
      }

      const report = {
        generatedAt: new Date().toISOString(),
        dashboard: initial,
        sessionValues,
        menus: { origini: originiMenu, tipi: tipiMenu },
        byStore: storeRuns,
        networkEvents: uniq(networkEvents.map((e) => `${e.status} ${e.type} ${e.url}`)),
        networkPreview: networkEvents
          .filter((e) => /session-values|kpi\//i.test(e.url))
          .slice(0, 20),
      };

      const fs = await import("fs");
      if (!fs.existsSync("tmp")) fs.mkdirSync("tmp");
      fs.writeFileSync("tmp/dashboard-analysis.json", JSON.stringify(report, null, 2));
      page.off("response", onResponse);
      await dumpPageContext(page, "dashboard-analysis-end");
      log("ANALISI SALVATA in tmp/dashboard-analysis.json");
      log("MENU ORIGINI:", JSON.stringify(originiMenu));
      log("MENU TIPI:", JSON.stringify(tipiMenu));
      log("STORE TESTATI:", JSON.stringify(storeRuns.map((s) => s.selected)));
      return;
    }

    const kpis = await page.evaluate(() => {
      const cards = [];
      const nodes = document.querySelectorAll(".card, .kpi-card, .widget, .panel");
      nodes.forEach((n) => {
        const text = (n.textContent || "").trim().replace(/\s+/g, " ");
        if (!text) return;
        const m = text.match(/^(.*?)(-?\d[\d\.,]*\s*€?)/);
        if (m) cards.push({ title: m[1].trim(), value: m[2].trim() });
      });
      return cards.slice(0, 30);
    }).catch(() => []);
    log("KPI dashboard estratti:", JSON.stringify(kpis));

    const righe = await page.$$eval("table tbody tr, .table tbody tr", (rows) =>
      rows.map((row) => {
        const cells = row.querySelectorAll("td");
        const data = cells[0]?.textContent?.trim() ?? "";
        const importo = cells[1]?.textContent?.trim() ?? (cells[2]?.textContent?.trim() ?? "");
        return { data, importo };
      })
    );
    log("Righe tabella estratte:", righe.length);

    if (DEBUG && righe.length > 0) {
      const prima = righe.slice(0, 3).map((r) => ({ data: r.data, importo: r.importo }));
      log("Anteprima righe:", JSON.stringify(prima));
    }

    const incassi = [];
    for (const r of righe) {
      const data = parseData(r.data);
      const importo = parseImporto(r.importo);
      if (data && !isNaN(importo) && importo > 0) {
        incassi.push({ data, importo, puntoVenditaId });
      }
    }
    log("Incassi validi parsati:", incassi.length);
    if (STOP_BEFORE_POST) {
      log("STOP_BEFORE_POST=1: test completato fino a parsing tabella, nessun invio API");
      return;
    }

    if (incassi.length === 0) {
      log("0 incassi estratti (tabella vuota o selettori da verificare)");
      return;
    }

    log("POST /api/incassi...");
    const res = await postJson(`${GESTIONALE_URL}/api/incassi`, API_KEY, { incassi, fonte: "SCRAPING" });
    let body = {};
    try {
      body = JSON.parse(res.body || "{}");
    } catch {
      body = { raw: res.body || "" };
    }
    if (!res.ok) {
      console.error("API incassi:", res.status, body);
      process.exit(1);
    }
    log("Ok:", body.count ?? incassi.length, "incassi caricati");
  } finally {
    await browser?.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
