"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Plus, Pencil, Trash2, Package } from "lucide-react";

const CATEGORIE = ["PANE", "CARNE", "FORMAGGI", "SALSE", "VERDURE", "BEVANDE", "ALTRO"];
const UNITA = ["KG", "GRAMMI", "LITRI", "PEZZI"];

const categoriaLabel: Record<string, string> = {
  PANE: "Pane",
  CARNE: "Carne",
  FORMAGGI: "Formaggi",
  SALSE: "Salse",
  VERDURE: "Verdure",
  BEVANDE: "Bevande",
  ALTRO: "Altro",
};

const categoriaColor: Record<string, string> = {
  PANE: "bg-amber-100 text-amber-700",
  CARNE: "bg-red-100 text-red-700",
  FORMAGGI: "bg-yellow-100 text-yellow-700",
  SALSE: "bg-orange-100 text-orange-700",
  VERDURE: "bg-green-100 text-green-700",
  BEVANDE: "bg-blue-100 text-blue-700",
  ALTRO: "bg-gray-100 text-gray-700",
};

interface Prodotto {
  id: string;
  nome: string;
  categoria: string;
  unitaMisura: string;
  sogliaMinima: number;
  costoMedio: number;
}

export default function ProdottiPage() {
  const [items, setItems] = useState<Prodotto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Prodotto | null>(null);
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState({
    nome: "",
    categoria: "ALTRO",
    unitaMisura: "PEZZI",
    sogliaMinima: "0",
    costoMedio: "0",
  });

  const load = () =>
    fetch("/api/prodotti")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ nome: "", categoria: "ALTRO", unitaMisura: "PEZZI", sogliaMinima: "0", costoMedio: "0" });
    setModal(true);
  };

  const openEdit = (p: Prodotto) => {
    setEditing(p);
    setForm({
      nome: p.nome,
      categoria: p.categoria,
      unitaMisura: p.unitaMisura,
      sogliaMinima: String(p.sogliaMinima),
      costoMedio: String(p.costoMedio),
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.nome.trim()) return;
    const url = editing ? `/api/prodotti/${editing.id}` : "/api/prodotti";
    const method = editing ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setModal(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminare questo prodotto?")) return;
    await fetch(`/api/prodotti/${id}`, { method: "DELETE" });
    load();
  };

  const filtered = items.filter(
    (p) =>
      p.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      categoriaLabel[p.categoria]?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Prodotti / Ingredienti"
        description="Anagrafica ingredienti con soglie di riordino e costi"
        action={
          <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
            <Plus size={16} /> Nuovo Prodotto
          </button>
        }
      />

      {/* Filtro */}
      <div className="mb-4">
        <input
          className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Cerca prodotto o categoria..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <Package size={40} className="mx-auto mb-3 text-muted" />
          <p className="font-medium">Nessun prodotto trovato</p>
          <p className="mt-1 text-sm text-muted">Aggiungi il primo ingrediente per iniziare</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Unità</th>
                <th className="px-4 py-3 font-medium text-right">Soglia Min.</th>
                <th className="px-4 py-3 font-medium text-right">Costo Medio</th>
                <th className="px-4 py-3 font-medium text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-alt/50">
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoriaColor[p.categoria] || ""}`}>
                      {categoriaLabel[p.categoria] || p.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.unitaMisura}</td>
                  <td className="px-4 py-3 text-right">{p.sogliaMinima}</td>
                  <td className="px-4 py-3 text-right font-medium">{p.costoMedio.toFixed(2)} &euro;</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="rounded p-1.5 text-muted hover:bg-surface-alt hover:text-foreground">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => remove(p.id)} className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Modifica Prodotto" : "Nuovo Prodotto"}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome *</label>
            <input
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Es: Mozzarella"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Categoria</label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                {CATEGORIE.map((c) => (
                  <option key={c} value={c}>{categoriaLabel[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Unità di Misura</label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.unitaMisura}
                onChange={(e) => setForm({ ...form, unitaMisura: e.target.value })}
              >
                {UNITA.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Soglia Minima</label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.sogliaMinima}
                onChange={(e) => setForm({ ...form, sogliaMinima: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Costo Medio (&euro;)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.costoMedio}
                onChange={(e) => setForm({ ...form, costoMedio: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-alt">Annulla</button>
            <button onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
              {editing ? "Salva" : "Crea"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
