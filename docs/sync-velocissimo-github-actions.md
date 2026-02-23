# Sync incassi Velocissimo con GitHub Actions

Su **Vercel** Chrome (Puppeteer) non può girare: mancano le librerie di sistema (libnss3, libnspr4). Lo scraping con browser va quindi eseguito **fuori da Vercel**.

La soluzione consigliata è usare **GitHub Actions**: il workflow gira su Ubuntu, dove Chrome è disponibile, ogni 6 minuti e invia gli incassi al gestionale (POST alla tua app su Vercel).

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

## Esecuzione locale (opzionale)

Sulla tua macchina (con Node e Chrome/Puppeteer):

```bash
export GESTIONALE_URL="https://gestionale-paninoteca.vercel.app"
export VELOCISSIMO_EMAIL="..."
export VELOCISSIMO_PASSWORD="..."
export INCASSI_API_KEY="..."
npm install puppeteer
node scripts/sync-velocissimo-github-actions.mjs
```

Così puoi testare lo script senza aspettare il cron.
