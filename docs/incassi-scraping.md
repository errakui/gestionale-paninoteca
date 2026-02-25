# Incassi dal portale esterno: opzioni e scraping

Gli incassi giornalieri possono arrivare nel gestionale in tre modi.

## 1. Inserimento manuale o CSV (consigliato per iniziare)

- **Incassi** nel menu → **Aggiungi incasso** (singolo giorno) o **Carica CSV** (più giorni).
- Formato CSV: una riga per giorno, `data;importo`. Esempio:
  ```text
  2025-02-01;1200.50
  2025-02-02;1350.00
  09/02/2025;1100
  ```
- Se il portale esterno permette di **esportare report (CSV/Excel)**, usa quell’export e adatta le colonne al formato sopra (o aggiungi un mapping nel gestionale in seguito).

## 2. API del gestionale per script esterni

Uno script (Node, Python, cron sul server) può inviare gli incassi senza usare il browser.

### Endpoint

- **POST** `/api/incassi`  
  Body (JSON):
  ```json
  {
    "incassi": [
      { "data": "2025-02-09", "importo": 1234.56, "puntoVenditaId": "id-sede-1" },
      { "data": "2025-02-08", "importo": 1100.00, "puntoVenditaId": "id-sede-1" }
    ],
    "fonte": "SCRAPING"
  }
  ```
- Per un solo giorno puoi usare anche:
  ```json
  {
    "data": "2025-02-09",
    "importo": 1234.56,
    "puntoVenditaId": "id-sede-1",
    "fonte": "SCRAPING",
    "note": "Portale X - chiusura cassa"
  }
  ```

Se l’app è su Vercel, l’URL sarà tipo `https://tuodominio.vercel.app/api/incassi`. Lo script deve essere eseguito da un server o da un cron job (non dal browser del portale) e deve inviare le richieste con eventuale token se in futuro aggiungerai autenticazione API.

### Ottenere gli ID punti vendita

- **GET** `https://tuodominio.vercel.app/api/punti-vendita` (da utente autenticato, o esponi una route solo per script con chiave API) per avere la lista e gli `id` da usare in `puntoVenditaId`.

## 3. Scraping del portale (solo se non c’è API/export)

Se il portale **non** offre export o API, si può fare scraping: uno script apre la pagina, fa login, legge gli incassi dall’HTML e li invia all’API sopra.

**Nel progetto è incluso uno script pronto:** vedi **`scripts/scrape-incassi/README.md`**. Lo script usa Puppeteer, è configurabile con `config.json` (URL e selettori) e `.env` (credenziali portale + `INCASSI_API_KEY` del gestionale). Dopo aver impostato i selettori sulla pagina reale del portale, esegui `npm run scrape` (anche in cron).

### Cosa serve

- **Puppeteer** (Node): apre un browser “virtuale”, esegue login, naviga al report incassi.
- Lo script estrae dalla pagina le date e gli importi (selettori CSS in `config.json`), forma l’array `incassi` e chiama `POST /api/incassi` con header `x-api-key`.
- Esecuzione: **cron job** sul server (es. ogni notte) o esecuzione manuale.

### Esempio concettuale (lo script reale è in scripts/scrape-incassi)

```js
const puppeteer = require("puppeteer");

async function scrapeIncassi() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://portale-esterno.it/login");
  await page.type("#username", process.env.PORTALE_USER);
  await page.type("#password", process.env.PORTALE_PASS);
  await page.click("button[type=submit]");
  await page.waitForNavigation();
  await page.goto("https://portale-esterno.it/incassi-giornalieri");

  const rows = await page.$$eval("table.incassi tbody tr", (trs) =>
    trs.map((tr) => {
      const cells = tr.querySelectorAll("td");
      const data = cells[0]?.textContent?.trim();
      const importo = cells[1]?.textContent?.trim().replace(",", ".");
      return { data, importo: parseFloat(importo) };
    })
  );

  await browser.close();

  const puntoVenditaId = process.env.PUNTO_VENDITA_ID;
  const incassi = rows
    .filter((r) => r.data && !isNaN(r.importo))
    .map((r) => ({ data: r.data, importo: r.importo, puntoVenditaId }));

  const res = await fetch("https://tuodominio.vercel.app/api/incassi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ incassi, fonte: "SCRAPING" }),
  });
  console.log(await res.json());
}
```

- I selettori (`#username`, `table.incassi`, ecc.) vanno **adattati** al portale reale (ispeziona l’HTML con F12).
- Credenziali e URL vanno messi in variabili d’ambiente, mai nel codice.

### Attenzione

- **Termini di servizio**: molti portali vietano lo scraping. Verifica il ToS; in caso di dubbio preferisci export/API o chiedi al fornitore un’integrazione ufficiale.
- **Fragilità**: se il portale cambia layout o login, lo script va aggiornato.
- **Dati sensibili**: esegui lo script in ambiente sicuro (server/cron), non in un PC condiviso.

## Riepilogo

| Metodo              | Quando usarlo                          |
|---------------------|----------------------------------------|
| Manuale / CSV       | Sempre utile; ideale se c’è export CSV |
| API (script custom) | Hai già dati in un altro sistema/DB    |
| Scraping            | Solo se non c’è API né export          |

Per qualsiasi integrazione (scraping incluso), il punto di ingresso dati economici è sempre **POST /api/incassi**.

## Cache KPI dashboard Velocissimo (oggi/ieri)

Per non riscrappare ad ogni apertura pagina, lo script headless può salvare una cache dei KPI filtrati.

- **POST** `/api/velocissimo/analytics-cache` (header `x-api-key`)
- Body minimo:
  ```json
  {
    "day": "2026-02-25",
    "storeValue": "-1",
    "storeText": "--Globale--",
    "origins": ["Tutte le origini"],
    "types": ["Tutti i tipi"],
    "metrics": {
      "Numero ordini": { "current": "11", "previous": "16", "delta": "31.25", "sign": "-" },
      "Totale venduto": { "current": "164.20", "previous": "234.70", "delta": "30.00", "sign": "-" }
    }
  }
  ```
- **GET** `/api/velocissimo/analytics-cache?limit=6` per leggere gli ultimi snapshot nel gestionale.
