import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Punti Vendita
  const pv1 = await prisma.puntoVendita.create({
    data: { nome: "Paninoteca Centro", indirizzo: "Via Roma 15, Milano", telefono: "+39 02 1234567" },
  });
  const pv2 = await prisma.puntoVendita.create({
    data: { nome: "Paninoteca Stazione", indirizzo: "Piazza Duca d'Aosta 1, Milano", telefono: "+39 02 7654321" },
  });

  // Prodotti
  const mozzarella = await prisma.prodotto.create({
    data: { nome: "Mozzarella", categoria: "FORMAGGI", unitaMisura: "KG", sogliaMinima: 3, costoMedio: 8.5 },
  });
  const prosciuttoCrudo = await prisma.prodotto.create({
    data: { nome: "Prosciutto Crudo", categoria: "CARNE", unitaMisura: "KG", sogliaMinima: 2, costoMedio: 22 },
  });
  const prosciuttoCotto = await prisma.prodotto.create({
    data: { nome: "Prosciutto Cotto", categoria: "CARNE", unitaMisura: "KG", sogliaMinima: 2, costoMedio: 15 },
  });
  const paneCiabatta = await prisma.prodotto.create({
    data: { nome: "Pane Ciabatta", categoria: "PANE", unitaMisura: "PEZZI", sogliaMinima: 30, costoMedio: 0.25 },
  });
  const paneIntegrale = await prisma.prodotto.create({
    data: { nome: "Pane Integrale", categoria: "PANE", unitaMisura: "PEZZI", sogliaMinima: 20, costoMedio: 0.35 },
  });
  const lattuga = await prisma.prodotto.create({
    data: { nome: "Lattuga", categoria: "VERDURE", unitaMisura: "KG", sogliaMinima: 1, costoMedio: 3 },
  });
  const pomodoro = await prisma.prodotto.create({
    data: { nome: "Pomodoro", categoria: "VERDURE", unitaMisura: "KG", sogliaMinima: 2, costoMedio: 2.5 },
  });
  const maionese = await prisma.prodotto.create({
    data: { nome: "Maionese", categoria: "SALSE", unitaMisura: "KG", sogliaMinima: 1, costoMedio: 4 },
  });
  const cocaCola = await prisma.prodotto.create({
    data: { nome: "Coca Cola 33cl", categoria: "BEVANDE", unitaMisura: "PEZZI", sogliaMinima: 24, costoMedio: 0.6 },
  });
  const acqua = await prisma.prodotto.create({
    data: { nome: "Acqua 50cl", categoria: "BEVANDE", unitaMisura: "PEZZI", sogliaMinima: 24, costoMedio: 0.2 },
  });

  // Ricette
  await prisma.ricetta.create({
    data: {
      nome: "Panino Classico",
      descrizione: "Prosciutto crudo, mozzarella, pomodoro",
      prezzo: 5.5,
      ingredienti: {
        create: [
          { prodottoId: paneCiabatta.id, quantita: 1 },
          { prodottoId: prosciuttoCrudo.id, quantita: 0.08 },
          { prodottoId: mozzarella.id, quantita: 0.1 },
          { prodottoId: pomodoro.id, quantita: 0.05 },
        ],
      },
    },
  });

  await prisma.ricetta.create({
    data: {
      nome: "Panino Vegetariano",
      descrizione: "Mozzarella, lattuga, pomodoro, maionese",
      prezzo: 4.5,
      ingredienti: {
        create: [
          { prodottoId: paneIntegrale.id, quantita: 1 },
          { prodottoId: mozzarella.id, quantita: 0.12 },
          { prodottoId: lattuga.id, quantita: 0.05 },
          { prodottoId: pomodoro.id, quantita: 0.06 },
          { prodottoId: maionese.id, quantita: 0.02 },
        ],
      },
    },
  });

  await prisma.ricetta.create({
    data: {
      nome: "Panino del Giorno",
      descrizione: "Prosciutto cotto, lattuga, maionese",
      prezzo: 4.0,
      ingredienti: {
        create: [
          { prodottoId: paneCiabatta.id, quantita: 1 },
          { prodottoId: prosciuttoCotto.id, quantita: 0.08 },
          { prodottoId: lattuga.id, quantita: 0.04 },
          { prodottoId: maionese.id, quantita: 0.02 },
        ],
      },
    },
  });

  // Giacenze iniziali per PV1
  const prodottiIds = [
    { id: mozzarella.id, qty: 5 },
    { id: prosciuttoCrudo.id, qty: 3 },
    { id: prosciuttoCotto.id, qty: 4 },
    { id: paneCiabatta.id, qty: 50 },
    { id: paneIntegrale.id, qty: 25 },
    { id: lattuga.id, qty: 2 },
    { id: pomodoro.id, qty: 3 },
    { id: maionese.id, qty: 2 },
    { id: cocaCola.id, qty: 36 },
    { id: acqua.id, qty: 48 },
  ];

  for (const { id, qty } of prodottiIds) {
    await prisma.giacenza.create({
      data: { puntoVenditaId: pv1.id, prodottoId: id, quantita: qty },
    });
    await prisma.movimento.create({
      data: {
        tipo: "CARICO",
        quantita: qty,
        prodottoId: id,
        puntoVenditaId: pv1.id,
        note: "Carico iniziale",
      },
    });
  }

  // Giacenze iniziali per PV2 (più basse per mostrare sotto-soglia)
  const prodottiPv2 = [
    { id: mozzarella.id, qty: 2 },
    { id: prosciuttoCrudo.id, qty: 1 },
    { id: paneCiabatta.id, qty: 15 },
    { id: pomodoro.id, qty: 1 },
    { id: cocaCola.id, qty: 10 },
    { id: acqua.id, qty: 12 },
  ];

  for (const { id, qty } of prodottiPv2) {
    await prisma.giacenza.create({
      data: { puntoVenditaId: pv2.id, prodottoId: id, quantita: qty },
    });
    await prisma.movimento.create({
      data: {
        tipo: "CARICO",
        quantita: qty,
        prodottoId: id,
        puntoVenditaId: pv2.id,
        note: "Carico iniziale",
      },
    });
  }

  console.log("Seed completato!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
