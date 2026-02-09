"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { ArrowDown, ArrowUp, History, AlertTriangle, Warehouse } from "lucide-react";

interface PuntoVendita { id: string; nome: string }
interface Prodotto { id: string; nome: string; unitaMisura: string; sogliaMinima: number }
interface GiacenzaItem { id: string; quantita: number; prodotto: Prodotto; puntoVendita: PuntoVendita }
interface MovimentoItem { id: string; tipo: string; quantita: number; note: string | null; createdAt: string; prodotto: { nome: string }; puntoVendita: { nome: string } }

export default function MagazzinoPage() {
  const [puntiVendita, setPuntiVendita] = useState<PuntoVendita[]>([]);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [giacenze, setGiacenze] = useState<GiacenzaItem[]>([]);
  const [movimenti, setMovimenti] = useState<MovimentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pvSel, setPvSel] = useState("");
  const [modal, setModal] = useState(false);
  const [showMov, setShowMov] = useState(false);
  const [form, setForm] = useState({ tipo: "CARICO" as "CARICO" | "SCARICO", prodottoId: "", quantita: "1", note: "" });

  const loadAll = async () => {
    setLoading(true);
    const [pv, pr] = await Promise.all([fetch("/api/punti-vendita").then(r => r.json()), fetch("/api/prodotti").then(r => r.json())]);
    setPuntiVendita(pv); setProdotti(pr);
    if (pv.length > 0 && !pvSel) setPvSel(pv[0].id);
    setLoading(false);
  };

  const loadGiacenze = async () => {
    if (!pvSel) return;
    const [g, m] = await Promise.all([fetch(`/api/magazzino?puntoVenditaId=${pvSel}`).then(r => r.json()), fetch(`/api/magazzino/movimenti?puntoVenditaId=${pvSel}&limit=30`).then(r => r.json())]);
    setGiacenze(g); setMovimenti(m);
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (pvSel) loadGiacenze(); }, [pvSel]);

  const registra = async () => {
    if (!form.prodottoId || !pvSel) return;
    await fetch("/api/magazzino", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, puntoVenditaId: pvSel }) });
    setModal(false); setForm({ tipo: "CARICO", prodottoId: "", quantita: "1", note: "" }); loadGiacenze();
  };

  const inputCls = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

  return (
    <>
      <PageHeader title="Magazzino" description="Giacenze, carichi e scarichi per punto vendita"
        action={<div className="flex gap-2">
          <button onClick={() => setShowMov(!showMov)} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 shadow-sm hover:bg-stone-50"><History size={16} /> Storico</button>
          <button onClick={() => setModal(true)} className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700"><ArrowDown size={16} /> Registra Movimento</button>
        </div>}
      />

      <div className="mb-6">
        <select className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium focus:border-amber-500 focus:outline-none" value={pvSel} onChange={(e) => setPvSel(e.target.value)}>
          {puntiVendita.map((pv) => <option key={pv.id} value={pv.id}>{pv.nome}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>
      ) : giacenze.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 bg-white p-12 text-center">
          <Warehouse size={40} className="mx-auto mb-3 text-stone-300" /><p className="font-medium text-stone-700">Magazzino vuoto</p><p className="mt-1 text-sm text-stone-400">Registra il primo carico per vedere le giacenze</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-stone-100 bg-stone-50 text-left">
              <th className="px-4 py-3 font-medium text-stone-600">Prodotto</th><th className="px-4 py-3 font-medium text-stone-600">Unità</th><th className="px-4 py-3 font-medium text-stone-600 text-right">Giacenza</th><th className="px-4 py-3 font-medium text-stone-600 text-right">Soglia Min.</th><th className="px-4 py-3 font-medium text-stone-600 text-center">Stato</th>
            </tr></thead>
            <tbody>
              {giacenze.map((g) => {
                const sotto = g.prodotto.sogliaMinima > 0 && g.quantita <= g.prodotto.sogliaMinima;
                return (
                  <tr key={g.id} className={`border-b border-stone-100 last:border-0 ${sotto ? "bg-red-50/50" : "hover:bg-stone-50/50"}`}>
                    <td className="px-4 py-3 font-medium text-stone-900">{g.prodotto.nome}</td>
                    <td className="px-4 py-3 text-stone-500">{g.prodotto.unitaMisura}</td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900">{g.quantita}</td>
                    <td className="px-4 py-3 text-right text-stone-500">{g.prodotto.sogliaMinima}</td>
                    <td className="px-4 py-3 text-center">
                      {sotto ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"><AlertTriangle size={12} /> Sotto soglia</span>
                        : <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">OK</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showMov && (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-stone-900">Storico Movimenti</h3>
          {movimenti.length === 0 ? <p className="text-sm text-stone-400">Nessun movimento registrato</p> : (
            <div className="space-y-2">
              {movimenti.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-stone-50">
                  <div className={`rounded-full p-1.5 ${m.tipo === "CARICO" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {m.tipo === "CARICO" ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                  </div>
                  <div className="flex-1"><p className="text-sm font-medium text-stone-800">{m.prodotto.nome}</p>{m.note && <p className="text-xs text-stone-400">{m.note}</p>}</div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${m.tipo === "CARICO" ? "text-green-600" : "text-red-600"}`}>{m.tipo === "CARICO" ? "+" : "-"}{m.quantita}</p>
                    <p className="text-xs text-stone-400">{new Date(m.createdAt).toLocaleString("it-IT")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Registra Movimento">
        <div className="space-y-4">
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Tipo</label>
            <div className="flex gap-2">
              <button onClick={() => setForm({ ...form, tipo: "CARICO" })} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${form.tipo === "CARICO" ? "border-green-500 bg-green-50 text-green-700" : "border-stone-200 text-stone-600"}`}><ArrowDown size={16} /> Carico</button>
              <button onClick={() => setForm({ ...form, tipo: "SCARICO" })} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${form.tipo === "SCARICO" ? "border-red-500 bg-red-50 text-red-700" : "border-stone-200 text-stone-600"}`}><ArrowUp size={16} /> Scarico</button>
            </div>
          </div>
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Prodotto *</label><select className={inputCls} value={form.prodottoId} onChange={(e) => setForm({ ...form, prodottoId: e.target.value })}><option value="">Seleziona prodotto</option>{prodotti.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.unitaMisura})</option>)}</select></div>
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Quantità</label><input type="number" min="0.1" step="0.1" className={inputCls} value={form.quantita} onChange={(e) => setForm({ ...form, quantita: e.target.value })} /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Note</label><input className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Es: Consegna fornitore XYZ" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50">Annulla</button>
            <button onClick={registra} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">Registra</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
