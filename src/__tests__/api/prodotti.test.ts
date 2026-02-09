import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../prisma-mock";

// Mock next/server
vi.mock("next/server", () => {
  return {
    NextRequest: class {
      url: string;
      nextUrl: URL;
      constructor(url: string, init?: { method?: string; body?: string }) {
        this.url = url;
        this.nextUrl = new URL(url);
        if (init?.body) {
          this._body = init.body;
        }
      }
      _body?: string;
      async json() {
        return JSON.parse(this._body || "{}");
      }
    },
    NextResponse: {
      json: (data: unknown, init?: { status?: number }) => ({
        data,
        status: init?.status || 200,
        async json() {
          return data;
        },
      }),
    },
  };
});

describe("API Prodotti", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/prodotti - ritorna lista prodotti", async () => {
    const mockProdotti = [
      {
        id: "1",
        nome: "Mozzarella",
        categoria: "FORMAGGI",
        unitaMisura: "KG",
        sogliaMinima: 5,
        costoMedio: 8.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        nome: "Pane Ciabatta",
        categoria: "PANE",
        unitaMisura: "PEZZI",
        sogliaMinima: 20,
        costoMedio: 0.3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    prismaMock.prodotto.findMany.mockResolvedValue(mockProdotti);

    const { GET } = await import("@/app/api/prodotti/route");
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveLength(2);
    expect(data[0].nome).toBe("Mozzarella");
    expect(data[1].nome).toBe("Pane Ciabatta");
    expect(prismaMock.prodotto.findMany).toHaveBeenCalledWith({
      orderBy: { nome: "asc" },
    });
  });

  it("POST /api/prodotti - crea nuovo prodotto", async () => {
    const newProdotto = {
      id: "3",
      nome: "Prosciutto Crudo",
      categoria: "CARNE",
      unitaMisura: "KG",
      sogliaMinima: 3,
      costoMedio: 22.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.prodotto.create.mockResolvedValue(newProdotto);

    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/prodotti/route");

    const req = new NextRequest("http://localhost:3000/api/prodotti", {
      method: "POST",
      body: JSON.stringify({
        nome: "Prosciutto Crudo",
        categoria: "CARNE",
        unitaMisura: "KG",
        sogliaMinima: "3",
        costoMedio: "22",
      }),
    });

    const response = await POST(req as never);
    const data = await response.json();

    expect(data.nome).toBe("Prosciutto Crudo");
    expect(prismaMock.prodotto.create).toHaveBeenCalledWith({
      data: {
        nome: "Prosciutto Crudo",
        categoria: "CARNE",
        unitaMisura: "KG",
        sogliaMinima: 3,
        costoMedio: 22,
      },
    });
  });
});
