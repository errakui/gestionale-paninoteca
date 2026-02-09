"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Plus, Pencil, Trash2, MapPin, Phone } from "lucide-react";

interface PuntoVendita {
  id: string;
  nome: string;
  indirizzo: string | null;
  telefono: string | null;
  attivo: boolean;
  _count: { giacenze: number; vendite: number };
}

export default function PuntiVenditaPage() {
  const [items, setItems] = useState<PuntoVendita[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<PuntoVendita | null>(null);
  const [form, setForm] = useState({ nome: "", indirizzo: "", telefono: "" });

  const load = () => fetch("/api/punti-vendita").then((r) => r.json()).then(setItems).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ nome: "", indirizzo: "", telefono: "" }); setModal(true); };
  const openEdit = (pv: PuntoVendita) => { setEditing(pv); setForm({ nome: pv.nome, indirizzo: pv.indirizzo || "", telefono: pv.telefono || "" }); setModal(true); };

  const save = async () => {
    if (!form.nome.trim()) return;
    const url = editing ? `/api/punti-vendita/${editing.id}` : "/api/punti-vendita";
    const method = editing ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { ...form, attivo: editing.attivo } : form) });
    setModal(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminare questo punto vendita? Tutti i dati associati verranno persi.")) return;
    await fetch(`/api/punti-vendita/${id}`, { method: "DELETE" }); load();
  };

  return (
    <>
      <PageHeader title="Punti Vendita" description="Gestisci le sedi delle paninoteche"
        action={<button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700"><Plus size={16} /> Nuovo Punto Vendita</button>}
      />

      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 bg-white p-12 text-center">
          <MapPin size={40} className="mx-auto mb-3 text-stone-300" />
          <p className="font-medium text-stone-700">Nessun punto vendita</p>
          <p className="mt-1 text-sm text-stone-400">Aggiungi il primo punto vendita per iniziare</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((pv) => (
            <div key={pv.id} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-stone-900">{pv.nome}</h3>
                  {pv.indirizzo && <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-500"><MapPin size={12} /> {pv.indirizzo}</p>}
                  {pv.telefono && <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-500"><Phone size={12} /> {pv.telefono}</p>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pv.attivo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{pv.attivo ? "Attivo" : "Inattivo"}</span>
              </div>
              <div className="mb-4 flex gap-4 text-sm text-stone-500"><span>{pv._count.giacenze} prodotti</span><span>{pv._count.vendite} vendite</span></div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(pv)} className="flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"><Pencil size={14} /> Modifica</button>
                <button onClick={() => remove(pv.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /> Elimina</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Modifica Punto Vendita" : "Nuovo Punto Vendita"}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Nome *</label>
            <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Es: Paninoteca Centro" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Indirizzo</label>
            <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} placeholder="Via Roma 1, Milano" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Telefono</label>
            <input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+39 02 1234567" />
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
