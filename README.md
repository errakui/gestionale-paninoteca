# Gestionale Paninoteca

Gestionale web per punti vendita multipli con moduli operativi (magazzino, ricette, vendite, ordini, HACCP) e integrazione scraping Velocissimo.

## Funzionalita principali

- Magazzino multi-sede (giacenze, carichi/scarichi, movimenti)
- Ricette con food cost
- Vendite e report
- Incassi esterni (Velocissimo) con:
  - salvataggio giornaliero su DB
  - cache KPI dashboard per filtri (negozio/origine/tipo)
  - storico KPI giorno per giorno

## Stack

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Prisma + PostgreSQL (Neon)
- GitHub Actions per scraping browser (Puppeteer)

## Architettura sync Velocissimo

Importante: Chrome/Puppeteer non gira in modo affidabile dentro Vercel runtime per questo progetto.

- **Vercel**: UI + API + database
- **GitHub Actions**: esecuzione scraping headless ogni 6 minuti

Flusso:
1. Workflow GitHub apre `admin.velocissimo.app`
2. Applica filtri (negozio/origine/tipo)
3. Legge KPI e dati disponibili
4. Salva su API del gestionale:
   - `POST /api/velocissimo/analytics-cache` (KPI)
   - `POST /api/incassi` (incassi)

## Setup locale

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

App su `http://localhost:3000`.

## Variabili ambiente

### Vercel (produzione)

Obbligatorie:
- `DATABASE_URL`
- `JWT_SECRET`
- `INCASSI_API_KEY`
- `VELOCISSIMO_EMAIL`
- `VELOCISSIMO_PASSWORD`

Per trigger workflow GitHub dal pulsante "Esegui sync ora":
- `GITHUB_SYNC_TOKEN` (token con permesso actions/workflow dispatch sul repo)
- `GITHUB_SYNC_REPO` (es. `owner/repo`)
- `GITHUB_SYNC_WORKFLOW` (default `sync-velocissimo.yml`)
- `GITHUB_SYNC_REF` (default `main`)

### GitHub Secrets (workflow)

- `GESTIONALE_URL` (es. `https://gestionale-paninoteca.vercel.app`)
- `VELOCISSIMO_EMAIL`
- `VELOCISSIMO_PASSWORD`
- `INCASSI_API_KEY`
- opzionali:
  - `VELOCISSIMO_SEDE`
  - `VELOCISSIMO_STORE_VALUE`
  - `VELOCISSIMO_ORIGINE_TEXT`
  - `VELOCISSIMO_TIPO_TEXT`
  - `DEBUG`

## Workflow GitHub

File: `.github/workflows/sync-velocissimo.yml`

- schedule: `*/6 * * * *` (ogni 6 minuti)
- trigger manuale da tab Actions

Verifica run:
```bash
gh run list --workflow "sync-velocissimo.yml"
gh run view <run-id> --log-failed
```

## Incassi e KPI in pagina

Pagina cliente: `Incassi esterni`

- filtri operativi:
  - periodo (da/a)
  - negozio Velocissimo
  - origine
  - tipo
- KPI aggregati sul periodo (somma giorno per giorno)
- storico KPI da cache

Dettagli tecnici/dev (log run, variabili, troubleshooting): solo in `Integrazioni -> Velocissimo`.

## Backfill storico (es. febbraio)

Esempio:
```bash
HEADLESS=true \
BACKFILL_FROM=2026-02-01 \
BACKFILL_TO=2026-02-24 \
BACKFILL_WRITE_INCASSI=1 \
node scripts/sync-velocissimo-github-actions.mjs
```

Questo salva KPI giorno per giorno; se richiesto, salva anche incassi giornalieri nel DB.

## Troubleshooting rapido

- Errore `Mancano GITHUB_SYNC_TOKEN o GITHUB_SYNC_REPO`:
  - aggiungere env su Vercel e ridistribuire
- Workflow GitHub fallisce con env vuote:
  - aggiungere GitHub Secrets mancanti
- In pagina non vedi dati:
  - controllare filtri attivi (sede interna/negozio/date)
  - verificare run GitHub e cron log integrazione
  - verificare righe su Neon (`incasso_giornaliero`, `velocissimo_analytics_cache`)

## Licenza

Uso interno progetto.
