import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Pulisci tutto
  await prisma.vendita.deleteMany();
  await prisma.movimento.deleteMany();
  await prisma.giacenza.deleteMany();
  await prisma.ricettaIngrediente.deleteMany();
  await prisma.ricetta.deleteMany();
  await prisma.prodotto.deleteMany();
  await prisma.utente.deleteMany();
  await prisma.puntoVendita.deleteMany();

  // Punti Vendita
  const pv1 = await prisma.puntoVendita.create({
    data: { nome: "Paninoteca Centro", indirizzo: "Via Roma 15, Milano", telefono: "+39 02 1234567" },
  });
  const pv2 = await prisma.puntoVendita.create({
    data: { nome: "Paninoteca Stazione", indirizzo: "Piazza Duca d'Aosta 1, Milano", telefono: "+39 02 7654321" },
  });

  // Utenti
  const hashAdmin = await bcrypt.hash("admin123", 10);
  const hashCentro = await bcrypt.hash("centro123", 10);
  const hashStazione = await bcrypt.hash("stazione123", 10);

  await prisma.utente.create({
    data: { email: "admin@daddysburger.it", password: hashAdmin, nome: "Francesco (Admin)", ruolo: "ADMIN", puntoVenditaId: null },
  });
  await prisma.utente.create({
    data: { email: "centro@daddysburger.it", password: hashCentro, nome: "Marco (Centro)", ruolo: "RESPONSABILE", puntoVenditaId: pv1.id },
  });
  await prisma.utente.create({
    data: { email: "stazione@daddysburger.it", password: hashStazione, nome: "Laura (Stazione)", ruolo: "RESPONSABILE", puntoVenditaId: pv2.id },
  });

  // Prodotti
  const mozzarella = await prisma.prodotto.create({ data: { nome: "Mozzarella", categoria: "FORMAGGI", unitaMisura: "KG", sogliaMinima: 3, costoMedio: 8.5 } });
  const prosciuttoCrudo = await prisma.prodotto.create({ data: { nome: "Prosciutto Crudo", categoria: "CARNE", unitaMisura: "KG", sogliaMinima: 2, costoMedio: 22 } });
  const prosciuttoCotto = await prisma.prodotto.create({ data: { nome: "Prosciutto Cotto", categoria: "CARNE", unitaMisura: "KG", sogliaMinima: 2, costoMedio: 15 } });
  const paneCiabatta = await prisma.prodotto.create({ data: { nome: "Pane Ciabatta", categoria: "PANE", unitaMisura: "PEZZI", sogliaMinima: 30, costoMedio: 0.25 } });
  const paneIntegrale = await prisma.prodotto.create({ data: { nome: "Pane Integrale", categoria: "PANE", unitaMisura: "PEZZI", sogliaMinima: 20, costoMedio: 0.35 } });
  const lattuga = await prisma.prodotto.create({ data: { nome: "Lattuga", categoria: "VERDURE", unitaMisura: "KG", sogliaMinima: 1, costoMedio: 3 } });
  const pomodoro = await prisma.prodotto.create({ data: { nome: "Pomodoro", categoria: "VERDURE", unitaMisura: "KG", sogliaMinima: 2, costoMedio: 2.5 } });
  const maionese = await prisma.prodotto.create({ data: { nome: "Maionese", categoria: "SALSE", unitaMisura: "KG", sogliaMinima: 1, costoMedio: 4 } });
  const cocaCola = await prisma.prodotto.create({ data: { nome: "Coca Cola 33cl", categoria: "BEVANDE", unitaMisura: "PEZZI", sogliaMinima: 24, costoMedio: 0.6 } });
  const acqua = await prisma.prodotto.create({ data: { nome: "Acqua 50cl", categoria: "BEVANDE", unitaMisura: "PEZZI", sogliaMinima: 24, costoMedio: 0.2 } });

  // Ricette
  const r1 = await prisma.ricetta.create({
    data: {
      nome: "Panino Classico", descrizione: "Prosciutto crudo, mozzarella, pomodoro", prezzo: 5.5,
      ingredienti: { create: [{ prodottoId: paneCiabatta.id, quantita: 1 }, { prodottoId: prosciuttoCrudo.id, quantita: 0.08 }, { prodottoId: mozzarella.id, quantita: 0.1 }, { prodottoId: pomodoro.id, quantita: 0.05 }] },
    },
  });
  const r2 = await prisma.ricetta.create({
    data: {
      nome: "Panino Vegetariano", descrizione: "Mozzarella, lattuga, pomodoro, maionese", prezzo: 4.5,
      ingredienti: { create: [{ prodottoId: paneIntegrale.id, quantita: 1 }, { prodottoId: mozzarella.id, quantita: 0.12 }, { prodottoId: lattuga.id, quantita: 0.05 }, { prodottoId: pomodoro.id, quantita: 0.06 }, { prodottoId: maionese.id, quantita: 0.02 }] },
    },
  });
  const r3 = await prisma.ricetta.create({
    data: {
      nome: "Panino del Giorno", descrizione: "Prosciutto cotto, lattuga, maionese", prezzo: 4.0,
      ingredienti: { create: [{ prodottoId: paneCiabatta.id, quantita: 1 }, { prodottoId: prosciuttoCotto.id, quantita: 0.08 }, { prodottoId: lattuga.id, quantita: 0.04 }, { prodottoId: maionese.id, quantita: 0.02 }] },
    },
  });

  // Giacenze e movimenti iniziali PV1
  const stockPV1 = [
    { id: mozzarella.id, qty: 5 }, { id: prosciuttoCrudo.id, qty: 3 }, { id: prosciuttoCotto.id, qty: 4 },
    { id: paneCiabatta.id, qty: 50 }, { id: paneIntegrale.id, qty: 25 }, { id: lattuga.id, qty: 2 },
    { id: pomodoro.id, qty: 3 }, { id: maionese.id, qty: 2 }, { id: cocaCola.id, qty: 36 }, { id: acqua.id, qty: 48 },
  ];
  for (const { id, qty } of stockPV1) {
    await prisma.giacenza.create({ data: { puntoVenditaId: pv1.id, prodottoId: id, quantita: qty } });
    await prisma.movimento.create({ data: { tipo: "CARICO", quantita: qty, prodottoId: id, puntoVenditaId: pv1.id, note: "Carico iniziale" } });
  }

  // Giacenze PV2 (sotto soglia per demo)
  const stockPV2 = [
    { id: mozzarella.id, qty: 2 }, { id: prosciuttoCrudo.id, qty: 1 }, { id: paneCiabatta.id, qty: 15 },
    { id: pomodoro.id, qty: 1 }, { id: cocaCola.id, qty: 10 }, { id: acqua.id, qty: 12 },
  ];
  for (const { id, qty } of stockPV2) {
    await prisma.giacenza.create({ data: { puntoVenditaId: pv2.id, prodottoId: id, quantita: qty } });
    await prisma.movimento.create({ data: { tipo: "CARICO", quantita: qty, prodottoId: id, puntoVenditaId: pv2.id, note: "Carico iniziale" } });
  }

  // Vendite di esempio (ultimi giorni)
  const oggi = new Date();
  const ieri = new Date(oggi); ieri.setDate(ieri.getDate() - 1);
  const avantieri = new Date(oggi); avantieri.setDate(avantieri.getDate() - 2);

  await prisma.vendita.createMany({
    data: [
      { ricettaId: r1.id, puntoVenditaId: pv1.id, quantita: 12, data: oggi },
      { ricettaId: r2.id, puntoVenditaId: pv1.id, quantita: 8, data: oggi },
      { ricettaId: r3.id, puntoVenditaId: pv1.id, quantita: 5, data: oggi },
      { ricettaId: r1.id, puntoVenditaId: pv2.id, quantita: 7, data: oggi },
      { ricettaId: r3.id, puntoVenditaId: pv2.id, quantita: 4, data: oggi },
      { ricettaId: r1.id, puntoVenditaId: pv1.id, quantita: 15, data: ieri },
      { ricettaId: r2.id, puntoVenditaId: pv1.id, quantita: 6, data: ieri },
      { ricettaId: r1.id, puntoVenditaId: pv2.id, quantita: 9, data: ieri },
      { ricettaId: r1.id, puntoVenditaId: pv1.id, quantita: 10, data: avantieri },
      { ricettaId: r3.id, puntoVenditaId: pv2.id, quantita: 3, data: avantieri },
    ],
  });

  console.log("Seed completato!");
  console.log("");
  console.log("Credenziali demo:");
  console.log("  Admin:     admin@daddysburger.it / admin123");
  console.log("  Centro:    centro@daddysburger.it / centro123");
  console.log("  Stazione:  stazione@daddysburger.it / stazione123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
