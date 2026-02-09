import { vi } from "vitest";

// Mock Prisma client per i test
export const prismaMock = {
  puntoVendita: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  prodotto: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  giacenza: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  movimento: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  ricetta: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  ricettaIngrediente: {
    deleteMany: vi.fn(),
  },
  vendita: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));
