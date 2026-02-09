import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../prisma-mock";

vi.mock("next/server", () => {
  return {
    NextRequest: class {
      url: string;
      nextUrl: URL;
      constructor(url: string, init?: { method?: string; body?: string }) {
        this.url = url;
        this.nextUrl = new URL(url);
        if (init?.body) this._body = init.body;
      }
      _body?: string;
      async json() { return JSON.parse(this._body || "{}"); }
    },
    NextResponse: {
      json: (data: unknown, init?: { status?: number }) => ({
        data,
        status: init?.status || 200,
        async json() { return data; },
      }),
    },
  };
});

describe("API Vendite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/vendite - registra vendita e scarica ingredienti", async () => {
    const mockRicetta = {
      id: "r1",
      nome: "Panino Classico",
      prezzo: 5.5,
      ingredienti: [
        { prodottoId: "p1", quantita: 0.1 },
        { prodottoId: "p2", quantita: 1 },
      ],
    };

    const mockVendita = {
      id: "v1",
      quantita: 2,
      data: new Date(),
      ricettaId: "r1",
      puntoVenditaId: "pv1",
      ricetta: { nome: "Panino Classico", prezzo: 5.5 },
      puntoVendita: { nome: "Centro" },
    };

    prismaMock.ricetta.findUnique.mockResolvedValue(mockRicetta);
    prismaMock.vendita.create.mockResolvedValue(mockVendita);
    prismaMock.movimento.create.mockResolvedValue({});
    prismaMock.giacenza.upsert.mockResolvedValue({});

    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/vendite/route");

    const req = new NextRequest("http://localhost:3000/api/vendite", {
      method: "POST",
      body: JSON.stringify({
        ricettaId: "r1",
        puntoVenditaId: "pv1",
        quantita: "2",
      }),
    });

    const response = await POST(req as never);
    const data = await response.json();

    expect(data.quantita).toBe(2);
    expect(prismaMock.ricetta.findUnique).toHaveBeenCalledWith({
      where: { id: "r1" },
      include: { ingredienti: true },
    });
    expect(prismaMock.vendita.create).toHaveBeenCalled();
    // Verifica che gli ingredienti siano stati scaricati (2 ingredienti x 1 chiamata ciascuno)
    expect(prismaMock.movimento.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.giacenza.upsert).toHaveBeenCalledTimes(2);
  });

  it("POST /api/vendite - errore se ricetta non trovata", async () => {
    prismaMock.ricetta.findUnique.mockResolvedValue(null);

    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/vendite/route");

    const req = new NextRequest("http://localhost:3000/api/vendite", {
      method: "POST",
      body: JSON.stringify({
        ricettaId: "inesistente",
        puntoVenditaId: "pv1",
        quantita: "1",
      }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(404);
  });
});
