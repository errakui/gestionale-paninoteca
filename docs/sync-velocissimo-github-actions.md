# Sync incassi Velocissimo con GitHub Actions

Su **Vercel** Chrome (Puppeteer) non può girare: mancano le librerie di sistema (libnss3, libnspr4). Lo scraping con browser va quindi eseguito **fuori da Vercel**.

La soluzione consigliata è usare **GitHub Actions**: il workflow gira su Ubuntu, dove Chrome è disponibile, ogni 6 minuti e invia gli incassi al gestionale (POST alla tua app su Vercel).

---

## Domande frequenti

### Vercel non funziona: quali alternative?

- **GitHub Actions** (questa soluzione): gratuito, Ubuntu con Chrome, cron ogni 6 min. I log di ogni run li vedi in **Actions** nel repo.
- **Railway / Render / Fly.io**: puoi far girare un worker o un cron con Puppeteer; ambiente Linux completo. A pagamento dopo le free tier.
- **VPS** (Hetzner, DigitalOcean, ecc.): installi Node + Puppeteer e un cron; controllo totale.
- **Browser-as-a-service** (Browserless.io, ScrapingBee, Apify): loro eseguono Chrome, tu invii URL/script. Di solito a pagamento.

Per il nostro caso **GitHub Actions è l’alternativa valida e gratuita** al “cloud Vercel” per lo scraping.

### Dove vedo il processo per perfezionare lo script?

- **In locale**: esegui `node scripts/sync-velocissimo-github-actions.mjs` con le env. Ogni passaggio viene stampato con prefisso `[sync]`. Con **`HEADLESS=false`** il browser si apre e vedi tutto a schermo (utile per aggiustare selettori). Con **`DEBUG=1`** in console vedi anche “cosa vedo” (testi cliccabili, anteprima righe tabella).
- **Su GitHub Actions**: apri il repo → **Actions** → “Sync Velocissimo incassi” → clicca su un run → **sync** (il job). Nella sezione “Sync incassi” vedi tutti i log (`[sync] ...`). Aggiungendo il secret **`DEBUG`** = `1` vedi anche le righe di debug (“cosa vedo”).

Quindi: **in locale** vedi il processo a schermo (HEADLESS=false) e in console; **nel cloud** (Actions) vedi lo stesso processo nei log del job.

### Se lo perfeziono in locale, funziona anche nel cloud?

**Sì.** È lo **stesso file** `scripts/sync-velocissimo-github-actions.mjs` che gira in locale e su GitHub Actions. Se modifichi selettori, tempi o logica in locale e fai push, il workflow userà la versione aggiornata. L’unica differenza è che in Actions il browser è sempre headless (nessuna finestra); il DOM e i selettori sono gli stessi.

## Setup (una tantum)

1. **Push del progetto su GitHub**  
   Assicurati che il repo sia su GitHub (il workflow è in `.github/workflows/sync-velocissimo.yml`).

2. **Secrets del repository**  
   Vai in **GitHub → repo → Settings → Secrets and variables → Actions** e aggiungi:

   | Nome | Valore |
   |------|--------|
   | `GESTIONALE_URL` | `https://gestionale-paninoteca.vercel.app` (o il tuo URL produzione) |
   | `VELOCISSIMO_EMAIL` | Email per il login su admin.velocissimo.app |
   | `VELOCISSIMO_PASSWORD` | Password del portale |
   | `INCASSI_API_KEY` | Stessa chiave che hai impostato su Vercel (env `INCASSI_API_KEY`) |

   Opzionale:
   - `VELOCISSIMO_SEDE` = testo da cliccare dopo il login (default: `Sorrento`)

3. **Vercel**  
   Su Vercel devono essere impostate almeno `INCASSI_API_KEY` e, se serve, le altre variabili del gestionale. Il cron in `vercel.json` può restare: la route risponderà che lo sync va fatto da GitHub Actions.

## Cosa fa il workflow

- **Schedule**: ogni 6 minuti (`*/6 * * * *`).
- **Esecuzione manuale**: dalla tab **Actions** puoi lanciare “Sync Velocissimo incassi” → “Run workflow”.
- Lo script (`scripts/sync-velocissimo-github-actions.mjs`) usa Puppeteer su Ubuntu, fa login su admin.velocissimo.app, seleziona la sede (es. Sorrento), legge la tabella incassi e invia i dati a `GESTIONALE_URL/api/incassi` con la chiave API.

## Verifica

- Dopo il primo run (automatico o manuale), controlla la tab **Actions** per eventuali errori.
- Nel gestionale, vai in **Incassi** o **Integrazioni → Velocissimo** e verifica che compaiano gli ultimi sync (aggiornati dall’API quando riceve il POST).

## Esecuzione locale (per test e perfezionamento)

Sulla tua macchina (Node + Puppeteer):

```bash
export GESTIONALE_URL="https://gestionale-paninoteca.vercel.app"
export VELOCISSIMO_EMAIL="..."
export VELOCISSIMO_PASSWORD="..."
export INCASSI_API_KEY="..."
npm install puppeteer
node scripts/sync-velocissimo-github-actions.mjs
```

- **Browser visibile** (per vedere i passi e correggere selettori):  
  `HEADLESS=false node scripts/sync-velocissimo-github-actions.mjs`
- **Log dettagliati + “cosa vedo” in pagina**:  
  `DEBUG=1 node scripts/sync-velocissimo-github-actions.mjs`  
  (in Actions puoi aggiungere il secret `DEBUG` = `1` per avere gli stessi log nel job).
