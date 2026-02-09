"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Plus, Pencil, Trash2, ChefHat, X } from "lucide-react";

interface Prodotto {
  id: string;
  nome: string;
  unitaMisura: string;
  costoMedio: number;
}

interface Ingrediente {
  id: string;
  quantita: number;
  prodotto: Prodotto;
}

interface Ricetta {
  id: string;
  nome: string;
  descrizione: string | null;
  prezzo: number;
  attiva: boolean;
  ingredienti: Ingrediente[];
}

interface IngredienteForm {
  prodottoId: string;
  quantita: number;
}

export default function RicettePage() {
  const [ricette, setRicette] = useState<Ricetta[]>([]);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Ricetta | null>(null);
  const [form, setForm] = useState({ nome: "", descrizione: "", prezzo: "0" });
  const [ingredienti, setIngredienti] = useState<IngredienteForm[]>([]);

  const load = async () => {
    setLoading(true);
    const [rRes, pRes] = await Promise.all([
      fetch("/api/ricette").then((r) => r.json()),
      fetch("/api/prodotti").then((r) => r.json()),
    ]);
    setRicette(rRes);
    setProdotti(pRes);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ nome: "", descrizione: "", prezzo: "0" });
    setIngredienti([]);
    setModal(true);
  };

  const openEdit = (r: Ricetta) => {
    setEditing(r);
    setForm({ nome: r.nome, descrizione: r.descrizione || "", prezzo: String(r.prezzo) });
    setIngredienti(r.ingredienti.map((i) => ({ prodottoId: i.prodotto.id, quantita: i.quantita })));
    setModal(true);
  };

  const addIngrediente = () => {
    setIngredienti([...ingredienti, { prodottoId: "", quantita: 1 }]);
  };

  const removeIngrediente = (idx: number) => {
    setIngredienti(ingredienti.filter((_, i) => i !== idx));
  };

  const updateIngrediente = (idx: number, field: keyof IngredienteForm, value: string | number) => {
    const updated = [...ingredienti];
    if (field === "quantita") {
      updated[idx].quantita = typeof value === "number" ? value : parseFloat(value) || 0;
    } else {
      updated[idx].prodottoId = String(value);
    }
    setIngredienti(updated);
  };

  const save = async () => {
    if (!form.nome.trim()) return;
    const payload = {
      ...form,
      ingredienti: ingredienti.filter((i) => i.prodottoId),
    };
    if (editing) {
      await fetch(`/api/ricette/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, attiva: editing.attiva }),
      });
    } else {
      await fetch("/api/ricette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setModal(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminare questa ricetta?")) return;
    await fetch(`/api/ricette/${id}`, { method: "DELETE" });
    load();
  };

  const calcCosto = (ingredientiList: Ingrediente[]) =>
    ingredientiList.reduce((sum, i) => sum + i.quantita * i.prodotto.costoMedio, 0);

  return (
    <>
      <PageHeader
        title="Ricette / Panini"
        description="Composizione panini con ingredienti e calcolo costi"
        action={
          <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
            <Plus size={16} /> Nuova Ricetta
          </button>
        }
      />

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : ricette.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <ChefHat size={40} className="mx-auto mb-3 text-muted" />
          <p className="font-medium">Nessuna ricetta</p>
          <p className="mt-1 text-sm text-muted">Crea la prima ricetta associando gli ingredienti</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ricette.map((r) => {
            const costo = calcCosto(r.ingredienti);
            const margine = r.prezzo > 0 ? ((r.prezzo - costo) / r.prezzo) * 100 : 0;
            return (
              <div key={r.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{r.nome}</h3>
                    {r.descrizione && <p className="mt-0.5 text-sm text-muted">{r.descrizione}</p>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.attiva ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {r.attiva ? "Attiva" : "Inattiva"}
                  </span>
                </div>

                {/* Ingredienti */}
                <div className="mb-3 space-y-1">
                  {r.ingredienti.map((ing) => (
                    <div key={ing.id} className="flex justify-between text-sm">
                      <span className="text-muted">{ing.prodotto.nome}</span>
                      <span>{ing.quantita} {ing.prodotto.unitaMisura}</span>
                    </div>
                  ))}
                </div>

                {/* Prezzi */}
                <div className="mb-4 flex gap-3 text-sm">
                  <div className="rounded-lg bg-surface-alt px-2 py-1">
                    <span className="text-muted">Prezzo: </span>
                    <span className="font-bold">{r.prezzo.toFixed(2)} &euro;</span>
                  </div>
                  <div className="rounded-lg bg-surface-alt px-2 py-1">
                    <span className="text-muted">Costo: </span>
                    <span className="font-bold">{costo.toFixed(2)} &euro;</span>
                  </div>
                  <div className={`rounded-lg px-2 py-1 ${margine > 30 ? "bg-green-50 text-green-700" : margine > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                    <span className="font-bold">{margine.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => openEdit(r)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-alt">
                    <Pencil size={14} /> Modifica
                  </button>
                  <button onClick={() => remove(r.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-danger hover:bg-red-50">
                    <Trash2 size={14} /> Elimina
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crea/modifica ricetta */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Modifica Ricetta" : "Nuova Ricetta"}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome *</label>
            <input
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Es: Panino Classico"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Descrizione</label>
            <input
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              placeholder="Es: Prosciutto crudo, mozzarella, pomodoro"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Prezzo di vendita (&euro;)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={form.prezzo}
              onChange={(e) => setForm({ ...form, prezzo: e.target.value })}
            />
          </div>

          {/* Ingredienti */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Ingredienti</label>
              <button onClick={addIngrediente} className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark">
                <Plus size={14} /> Aggiungi
              </button>
            </div>
            <div className="space-y-2">
              {ingredienti.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                    value={ing.prodottoId}
                    onChange={(e) => updateIngrediente(idx, "prodottoId", e.target.value)}
                  >
                    <option value="">Seleziona...</option>
                    {prodotti.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome} ({p.unitaMisura})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                    value={ing.quantita}
                    onChange={(e) => updateIngrediente(idx, "quantita", e.target.value)}
                  />
                  <button onClick={() => removeIngrediente(idx)} className="p-1 text-muted hover:text-danger">
                    <X size={16} />
                  </button>
                </div>
              ))}
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
