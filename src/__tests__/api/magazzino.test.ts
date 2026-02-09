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

describe("API Magazzino", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/magazzino - ritorna giacenze", async () => {
    const mockGiacenze = [
      {
        id: "g1",
        quantita: 10,
        prodotto: { id: "p1", nome: "Mozzarella", unitaMisura: "KG", sogliaMinima: 5 },
        puntoVendita: { id: "pv1", nome: "Centro" },
      },
    ];

    prismaMock.giacenza.findMany.mockResolvedValue(mockGiacenze);

    const { NextRequest } = await import("next/server");
    const { GET } = await import("@/app/api/magazzino/route");

    const req = new NextRequest("http://localhost:3000/api/magazzino?puntoVenditaId=pv1");
    const response = await GET(req as never);
    const data = await response.json();

    expect(data).toHaveLength(1);
    expect(data[0].quantita).toBe(10);
    expect(data[0].prodotto.nome).toBe("Mozzarella");
  });

  it("POST /api/magazzino - registra carico e aggiorna giacenza", async () => {
    const mockMovimento = {
      id: "m1",
      tipo: "CARICO",
      quantita: 5,
      prodottoId: "p1",
      puntoVenditaId: "pv1",
      note: "Consegna fornitore",
      createdAt: new Date(),
    };

    prismaMock.movimento.create.mockResolvedValue(mockMovimento);
    prismaMock.giacenza.upsert.mockResolvedValue({ id: "g1", quantita: 15 });

    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/magazzino/route");

    const req = new NextRequest("http://localhost:3000/api/magazzino", {
      method: "POST",
      body: JSON.stringify({
        tipo: "CARICO",
        quantita: "5",
        prodottoId: "p1",
        puntoVenditaId: "pv1",
        note: "Consegna fornitore",
      }),
    });

    const response = await POST(req as never);
    const data = await response.json();

    expect(data.tipo).toBe("CARICO");
    expect(data.quantita).toBe(5);
    expect(prismaMock.movimento.create).toHaveBeenCalled();
    expect(prismaMock.giacenza.upsert).toHaveBeenCalled();
  });
});
