"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Plus, Pencil, Trash2, Package } from "lucide-react";

const CATEGORIE = ["PANE", "CARNE", "FORMAGGI", "SALSE", "VERDURE", "BEVANDE", "ALTRO"];
const UNITA = ["KG", "GRAMMI", "LITRI", "PEZZI"];
const categoriaLabel: Record<string, string> = { PANE: "Pane", CARNE: "Carne", FORMAGGI: "Formaggi", SALSE: "Salse", VERDURE: "Verdure", BEVANDE: "Bevande", ALTRO: "Altro" };
const categoriaColor: Record<string, string> = { PANE: "bg-amber-100 text-amber-700", CARNE: "bg-red-100 text-red-700", FORMAGGI: "bg-yellow-100 text-yellow-700", SALSE: "bg-orange-100 text-orange-700", VERDURE: "bg-green-100 text-green-700", BEVANDE: "bg-blue-100 text-blue-700", ALTRO: "bg-stone-100 text-stone-700" };

interface Prodotto { id: string; nome: string; categoria: string; unitaMisura: string; sogliaMinima: number; costoMedio: number }

export default function ProdottiPage() {
  const [items, setItems] = useState<Prodotto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Prodotto | null>(null);
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState({ nome: "", categoria: "ALTRO", unitaMisura: "PEZZI", sogliaMinima: "0", costoMedio: "0" });

  const load = () => fetch("/api/prodotti").then((r) => r.json()).then(setItems).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ nome: "", categoria: "ALTRO", unitaMisura: "PEZZI", sogliaMinima: "0", costoMedio: "0" }); setModal(true); };
  const openEdit = (p: Prodotto) => { setEditing(p); setForm({ nome: p.nome, categoria: p.categoria, unitaMisura: p.unitaMisura, sogliaMinima: String(p.sogliaMinima), costoMedio: String(p.costoMedio) }); setModal(true); };

  const save = async () => {
    if (!form.nome.trim()) return;
    const url = editing ? `/api/prodotti/${editing.id}` : "/api/prodotti";
    await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setModal(false); load();
  };

  const remove = async (id: string) => { if (!confirm("Eliminare questo prodotto?")) return; await fetch(`/api/prodotti/${id}`, { method: "DELETE" }); load(); };

  const filtered = items.filter((p) => p.nome.toLowerCase().includes(filtro.toLowerCase()) || categoriaLabel[p.categoria]?.toLowerCase().includes(filtro.toLowerCase()));

  const inputCls = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

  return (
    <>
      <PageHeader title="Prodotti / Ingredienti" description="Anagrafica ingredienti con soglie di riordino e costi"
        action={<button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700"><Plus size={16} /> Nuovo Prodotto</button>}
      />

      <div className="mb-4">
        <input className={`${inputCls} max-w-sm`} placeholder="Cerca prodotto o categoria..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 bg-white p-12 text-center">
          <Package size={40} className="mx-auto mb-3 text-stone-300" /><p className="font-medium text-stone-700">Nessun prodotto trovato</p><p className="mt-1 text-sm text-stone-400">Aggiungi il primo ingrediente per iniziare</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-stone-100 bg-stone-50 text-left">
              <th className="px-4 py-3 font-medium text-stone-600">Nome</th><th className="px-4 py-3 font-medium text-stone-600">Categoria</th><th className="px-4 py-3 font-medium text-stone-600">Unità</th><th className="px-4 py-3 font-medium text-stone-600 text-right">Soglia Min.</th><th className="px-4 py-3 font-medium text-stone-600 text-right">Costo Medio</th><th className="px-4 py-3 font-medium text-stone-600 text-right">Azioni</th>
            </tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50">
                  <td className="px-4 py-3 font-medium text-stone-900">{p.nome}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoriaColor[p.categoria] || ""}`}>{categoriaLabel[p.categoria] || p.categoria}</span></td>
                  <td className="px-4 py-3 text-stone-500">{p.unitaMisura}</td>
                  <td className="px-4 py-3 text-right text-stone-700">{p.sogliaMinima}</td>
                  <td className="px-4 py-3 text-right font-medium text-stone-900">{p.costoMedio.toFixed(2)} &euro;</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"><Pencil size={14} /></button>
                      <button onClick={() => remove(p.id)} className="rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
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
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Nome *</label><input className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Es: Mozzarella" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Categoria</label><select className={inputCls} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>{CATEGORIE.map((c) => <option key={c} value={c}>{categoriaLabel[c]}</option>)}</select></div>
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Unità di Misura</label><select className={inputCls} value={form.unitaMisura} onChange={(e) => setForm({ ...form, unitaMisura: e.target.value })}>{UNITA.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Soglia Minima</label><input type="number" min="0" step="0.1" className={inputCls} value={form.sogliaMinima} onChange={(e) => setForm({ ...form, sogliaMinima: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Costo Medio (&euro;)</label><input type="number" min="0" step="0.01" className={inputCls} value={form.costoMedio} onChange={(e) => setForm({ ...form, costoMedio: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50">Annulla</button>
            <button onClick={save} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">{editing ? "Salva" : "Crea"}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
