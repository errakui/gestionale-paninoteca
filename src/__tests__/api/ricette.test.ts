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

describe("API Ricette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/ricette - ritorna lista ricette con ingredienti", async () => {
    const mockRicette = [
      {
        id: "r1",
        nome: "Panino Classico",
        descrizione: "Prosciutto e mozzarella",
        prezzo: 5.5,
        attiva: true,
        ingredienti: [
          { id: "ri1", quantita: 0.1, prodotto: { id: "p1", nome: "Mozzarella", unitaMisura: "KG", costoMedio: 8.5 } },
          { id: "ri2", quantita: 0.08, prodotto: { id: "p2", nome: "Prosciutto", unitaMisura: "KG", costoMedio: 22 } },
        ],
      },
    ];

    prismaMock.ricetta.findMany.mockResolvedValue(mockRicette);

    const { GET } = await import("@/app/api/ricette/route");
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveLength(1);
    expect(data[0].nome).toBe("Panino Classico");
    expect(data[0].ingredienti).toHaveLength(2);
  });

  it("POST /api/ricette - crea ricetta con ingredienti", async () => {
    const newRicetta = {
      id: "r2",
      nome: "Panino Vegetariano",
      descrizione: "Verdure e formaggi",
      prezzo: 4.5,
      attiva: true,
      ingredienti: [
        { id: "ri3", quantita: 0.15, prodotto: { id: "p3", nome: "Lattuga", unitaMisura: "KG" } },
      ],
    };

    prismaMock.ricetta.create.mockResolvedValue(newRicetta);

    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/ricette/route");

    const req = new NextRequest("http://localhost:3000/api/ricette", {
      method: "POST",
      body: JSON.stringify({
        nome: "Panino Vegetariano",
        descrizione: "Verdure e formaggi",
        prezzo: "4.5",
        ingredienti: [{ prodottoId: "p3", quantita: 0.15 }],
      }),
    });

    const response = await POST(req as never);
    const data = await response.json();

    expect(data.nome).toBe("Panino Vegetariano");
    expect(prismaMock.ricetta.create).toHaveBeenCalled();
  });
});
