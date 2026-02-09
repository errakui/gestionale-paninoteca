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

describe("API Punti Vendita", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/punti-vendita - ritorna lista punti vendita", async () => {
    const mockPV = [
      {
        id: "pv1",
        nome: "Paninoteca Centro",
        indirizzo: "Via Roma 1",
        telefono: "02 1234567",
        attivo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { giacenze: 5, vendite: 10 },
      },
    ];

    prismaMock.puntoVendita.findMany.mockResolvedValue(mockPV);

    const { GET } = await import("@/app/api/punti-vendita/route");
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveLength(1);
    expect(data[0].nome).toBe("Paninoteca Centro");
    expect(data[0]._count.giacenze).toBe(5);
  });

  it("POST /api/punti-vendita - crea nuovo punto vendita", async () => {
    const newPV = {
      id: "pv2",
      nome: "Paninoteca Stazione",
      indirizzo: "Piazza Garibaldi 5",
      telefono: null,
      attivo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.puntoVendita.create.mockResolvedValue(newPV);

    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/punti-vendita/route");

    const req = new NextRequest("http://localhost:3000/api/punti-vendita", {
      method: "POST",
      body: JSON.stringify({
        nome: "Paninoteca Stazione",
        indirizzo: "Piazza Garibaldi 5",
      }),
    });

    const response = await POST(req as never);
    const data = await response.json();

    expect(data.nome).toBe("Paninoteca Stazione");
    expect(prismaMock.puntoVendita.create).toHaveBeenCalled();
  });
});
