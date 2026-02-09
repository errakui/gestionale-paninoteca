# Gestionale Paninoteca - MVP

Software di gestione magazzino multi-punto vendita per paninoteche.

## Funzionalità

- **Anagrafica Prodotti/Ingredienti** — categorie, unità di misura, soglie di riordino, costi medi
- **Multi Punto Vendita** — ogni sede separata ma confrontabile
- **Magazzino** — giacenze in tempo reale, carichi/scarichi, storico movimenti
- **Ricette/Panini** — composizione ingredienti, calcolo food cost, margine
- **Vendite** — registrazione vendite con scarico automatico del magazzino
- **Dashboard** — panoramica, prodotti sotto soglia, confronto sedi, top vendite

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS 4**
- **Prisma ORM** + PostgreSQL
- **Vitest** per i test

## Setup Locale

### 1. Database PostgreSQL

Crea un database PostgreSQL gratuito su [Neon](https://neon.tech):
1. Registrati su neon.tech
2. Crea un nuovo progetto
3. Copia la connection string

### 2. Configurazione

```bash
# Clona e installa
npm install

# Configura il database
cp .env.example .env
# Modifica .env con la tua DATABASE_URL

# Genera client Prisma
npx prisma generate

# Crea le tabelle
npx prisma db push

# (Opzionale) Popola con dati di esempio
npx tsx prisma/seed.ts
```

### 3. Avvio

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

## Test

```bash
npm test
```

## Deploy su Vercel

1. Pusha il codice su GitHub
2. Importa il progetto su [vercel.com](https://vercel.com)
3. Aggiungi la variabile d'ambiente `DATABASE_URL` nelle impostazioni del progetto
4. Vercel builderà e deployerà automaticamente

## Struttura

```
src/
├── app/
│   ├── api/              # API Routes (CRUD)
│   │   ├── dashboard/
│   │   ├── magazzino/
│   │   ├── prodotti/
│   │   ├── punti-vendita/
│   │   ├── ricette/
│   │   └── vendite/
│   ├── dashboard/        # Dashboard page
│   ├── magazzino/        # Warehouse page
│   ├── prodotti/         # Products page
│   ├── punti-vendita/    # Locations page
│   ├── ricette/          # Recipes page
│   └── vendite/          # Sales page
├── components/           # UI Components
├── lib/                  # Prisma client
└── __tests__/            # Test suite
```

## Evoluzioni Future

- Integrazione POS
- Ordini automatici ai fornitori
- App mobile per carichi/scarichi
- Controllo food cost avanzato
- Sistema ruoli (titolare / responsabile)
- Accesso dedicato per affiliati
