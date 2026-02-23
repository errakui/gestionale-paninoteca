# Scraping incassi dal portale esterno

Questo script fa login sul portale dove sono registrati gli incassi giornalieri, estrae la tabella e invia i dati al gestionale (`POST /api/incassi`).

## Velocissimo (admin.velocissimo.app, Sorrento)

Per il portale Velocissimo con sede Sorrento:

1. Copia la config dedicata: `cp config.velocissimo.json config.json`
2. In `config.json` inserisci `gestionale.puntoVenditaId` con l’ID della sede Sorrento (dal gestionale).
3. In `.env`: `PORTALE_USER=magazzino@daddysburger.it`, `PORTALE_PASSWORD=...`, `INCASSI_API_KEY=...` (stessa del gestionale).
4. Lo script fa login, seleziona **Sorrento** dal menu in alto a destra e poi estrae la tabella incassi. Se la dashboard ha selettori diversi, adatta `portale.selectors` in `config.json` (vedi sotto).

## Requisiti

- Node.js 18+
- Sul portale: pagina di login + pagina con tabella incassi (data + importo)

## Setup

1. **Copia i file di config**
   ```bash
   cd scripts/scrape-incassi
   cp config.example.json config.json
   cp .env.example .env
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura il gestionale**
   - Nel progetto principale (gestionale), in `.env` imposta una chiave segreta:
     ```env
     INCASSI_API_KEY=una-stringa-lunga-e-casuale
     ```
   - La stessa chiave va in `scripts/scrape-incassi/.env`:
     ```env
     INCASSI_API_KEY=una-stringa-lunga-e-casuale
     ```

4. **Ottieni l’ID del punto vendita**
   - Dal gestionale: vai in **Punti Vendita**, apri la sede che ti interessa e prendi l’ID dall’URL (es. `/punti-vendita/abc123`) oppure apri DevTools → Network → chiamata a `/api/punti-vendita` e copia l’`id` della sede.
   - In `config.json` imposta `gestionale.puntoVenditaId` con quell’ID.

5. **Configura il portale in `config.json`**
   - `portale.loginUrl`: URL della pagina di login.
   - `portale.incassiUrl`: URL della pagina dove vedi la tabella degli incassi (dopo il login).
   - `portale.selectors`: selettori CSS per trovare campi e tabella (vedi sotto).

6. **Configura le credenziali in `.env`**
   ```env
   PORTALE_USER=tuo-username-o-email
   PORTALE_PASSWORD=tua-password
   ```

## Trovare i selettori (F12)

1. Apri il portale nel browser, fai login e vai alla pagina degli incassi.
2. Tasto destro sulla pagina → **Ispeziona** (F12).
3. Usa l’icona “Seleziona elemento” e clicca:
   - sul campo **username/email** del login → nel pannello Elements vedrai l’elemento (es. `input name="email"`). Il selettore può essere `input[name="email"]` o `#email` se ha `id="email"`.
   - sul campo **password** → es. `input[name="password"]` o `#password`.
   - sul **pulsante di login** → es. `button[type="submit"]` o `.btn-login`.
   - su **una riga della tabella incassi** (il `<tr>`). Se la tabella ha classe `incassi`, il selettore per le righe è `table.incassi tbody tr`. Altrimenti `table tbody tr`.
   - sulla **cella della data** (nella stessa riga) → spesso `td:nth-child(1)` (prima colonna).
   - sulla **cella dell’importo** → spesso `td:nth-child(2)` (seconda colonna). Se l’importo è in un’altra colonna, usa `td:nth-child(3)` ecc.

In `config.json`:

```json
"selectors": {
  "username": "input[name='email']",
  "password": "input[name='password']",
  "submit": "button[type='submit']",
  "rows": "table tbody tr",
  "data": "td:nth-child(1)",
  "importo": "td:nth-child(2)"
}
```

- **rows**: deve indicare tutte le righe della tabella (ogni `<tr>`).
- **data** e **importo**: si intendono **dentro ogni riga** (celle di quella riga). Usa selettori relativi come `td:nth-child(1)`.

## Formato data e importo

- **Data**: lo script accetta sia `yyyy-mm-dd` sia `gg/mm/yyyy` (o gg-mm-yyyy). Verrà convertita in `yyyy-mm-dd` per l’API.
- **Importo**: accetta numeri con virgola o punto decimale (es. `1234,56` o `1234.56`). I punti come separatore delle migliaia vengono rimossi.

Se nel portale la data o l’importo sono in formato strano, puoi modificare le funzioni `parseData` e `parseImporto` in `scrape.js`.

## Esecuzione

```bash
npm run scrape
```

Per vedere il browser (utile per debuggare):

```bash
npm run scrape:headed
```

Oppure:

```bash
HEADLESS=false node scrape.js
```

## Automazione ogni 6 min (senza usare il PC – Railway + cron-job.org)

**Vercel non può eseguire Puppeteer** (nessun browser in serverless). Per aggiornare gli incassi ogni 6 minuti senza tenere il PC acceso:

1. **Deploy su Railway** (o Render):
   - Crea un progetto su [railway.app](https://railway.app), collega il repo o carica la cartella `scripts/scrape-incassi`.
   - Variabili d’ambiente: `PORTALE_USER`, `PORTALE_PASSWORD`, `INCASSI_API_KEY`, `PUNTO_VENDITA_ID` (o compila `config.json`), e opzionale `CRON_SECRET` (segreto per chiamare `/run`).
   - Comando di avvio: `npm run server` (avvia `server.js` che espone l’endpoint `/run`).
   - Railway assegna un URL tipo `https://xxx.up.railway.app`.

2. **Cron esterno** (es. [cron-job.org](https://cron-job.org)):
   - Crea un cron che ogni 6 minuti fa una richiesta **GET** (o POST) a `https://xxx.up.railway.app/run`.
   - Header: `x-cron-secret: IL_TUO_CRON_SECRET` (stesso valore di `CRON_SECRET` su Railway).
   - In questo modo non devi usare il PC: lo script gira su Railway e viene lanciato da cron-job.org.

## Cron locale (esecuzione automatica)

Per lanciare lo script ogni giorno (es. alle 2 di notte) su un server Linux/Mac:

```bash
crontab -e
```

Aggiungi (adatta il percorso):

```
0 2 * * * cd /path/to/gestionale/scripts/scrape-incassi && node scrape.js >> /var/log/scrape-incassi.log 2>&1
```

Per ogni 6 minuti (se lo script è su un VPS):

```
*/6 * * * * cd /path/to/gestionale/scripts/scrape-incassi && node scrape.js >> /var/log/scrape-incassi.log 2>&1
```

## Sicurezza

- Non committare mai `config.json` o `.env` (sono in `.gitignore`).
- Usa `INCASSI_API_KEY` lunga e casuale (es. `openssl rand -hex 32`).
- Tieni le credenziali del portale solo in `.env` sull’ambiente che esegue lo script.
