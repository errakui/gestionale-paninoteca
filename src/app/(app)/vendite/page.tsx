"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Plus, ShoppingCart } from "lucide-react";

interface PuntoVendita { id: string; nome: string }
interface Ricetta { id: string; nome: string; prezzo: number; attiva: boolean }
interface VenditaItem { id: string; quantita: number; data: string; ricetta: { nome: string; prezzo: number }; puntoVendita: { nome: string } }

export default function VenditePage() {
  const [puntiVendita, setPuntiVendita] = useState<PuntoVendita[]>([]);
  const [ricette, setRicette] = useState<Ricetta[]>([]);
  const [vendite, setVendite] = useState<VenditaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pvSel, setPvSel] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ricettaId: "", quantita: "1", data: new Date().toISOString().split("T")[0] });

  const loadBase = async () => {
    const [pv, r] = await Promise.all([fetch("/api/punti-vendita").then(r => r.json()), fetch("/api/ricette").then(r => r.json())]);
    setPuntiVendita(pv); setRicette(r.filter((x: Ricetta) => x.attiva));
    if (pv.length > 0 && !pvSel) setPvSel(pv[0].id);
    setLoading(false);
  };

  const loadVendite = async () => { if (!pvSel) return; setVendite(await fetch(`/api/vendite?puntoVenditaId=${pvSel}`).then(r => r.json())); };

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { if (pvSel) loadVendite(); }, [pvSel]);

  const registra = async () => {
    if (!form.ricettaId || !pvSel) return;
    await fetch("/api/vendite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, puntoVenditaId: pvSel }) });
    setModal(false); setForm({ ricettaId: "", quantita: "1", data: new Date().toISOString().split("T")[0] }); loadVendite();
  };

  const venditePerData: Record<string, VenditaItem[]> = {};
  for (const v of vendite) { const k = new Date(v.data).toLocaleDateString("it-IT"); if (!venditePerData[k]) venditePerData[k] = []; venditePerData[k].push(v); }

  const inputCls = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

  return (
    <>
      <PageHeader title="Vendite" description="Registra vendite giornaliere con scarico automatico dal magazzino"
        action={<button onClick={() => setModal(true)} className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700"><Plus size={16} /> Registra Vendita</button>}
      />

      <div className="mb-6">
        <select className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium focus:border-amber-500 focus:outline-none" value={pvSel} onChange={(e) => setPvSel(e.target.value)}>
          {puntiVendita.map((pv) => <option key={pv.id} value={pv.id}>{pv.nome}</option>)}
        </select>
      </div>

      {loading ? <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>
      : vendite.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 bg-white p-12 text-center">
          <ShoppingCart size={40} className="mx-auto mb-3 text-stone-300" /><p className="font-medium text-stone-700">Nessuna vendita registrata</p><p className="mt-1 text-sm text-stone-400">Registra la prima vendita per iniziare</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(venditePerData).map(([data, items]) => {
            const tot = items.reduce((s, v) => s + v.ricetta.prezzo * v.quantita, 0);
            const pezzi = items.reduce((s, v) => s + v.quantita, 0);
            return (
              <div key={data}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-stone-900">{data}</h3>
                  <div className="flex gap-3 text-sm"><span className="text-stone-500">{pezzi} pezzi</span><span className="font-bold text-amber-600">{tot.toFixed(2)} &euro;</span></div>
                </div>
                <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-stone-100 bg-stone-50 text-left"><th className="px-4 py-2.5 font-medium text-stone-600">Ricetta</th><th className="px-4 py-2.5 font-medium text-stone-600 text-center">Qta</th><th className="px-4 py-2.5 font-medium text-stone-600 text-right">Prezzo</th><th className="px-4 py-2.5 font-medium text-stone-600 text-right">Totale</th></tr></thead>
                    <tbody>{items.map(v => (
                      <tr key={v.id} className="border-b border-stone-100 last:border-0">
                        <td className="px-4 py-2.5 font-medium text-stone-900">{v.ricetta.nome}</td>
                        <td className="px-4 py-2.5 text-center text-stone-700">{v.quantita}</td>
                        <td className="px-4 py-2.5 text-right text-stone-500">{v.ricetta.prezzo.toFixed(2)} &euro;</td>
                        <td className="px-4 py-2.5 text-right font-bold text-stone-900">{(v.ricetta.prezzo * v.quantita).toFixed(2)} &euro;</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Registra Vendita">
        <div className="space-y-4">
          <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Ricetta / Panino *</label>
            <select className={inputCls} value={form.ricettaId} onChange={e => setForm({ ...form, ricettaId: e.target.value })}>
              <option value="">Seleziona ricetta</option>{ricette.map(r => <option key={r.id} value={r.id}>{r.nome} — {r.prezzo.toFixed(2)} &euro;</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Quantità</label><input type="number" min="1" className={inputCls} value={form.quantita} onChange={e => setForm({ ...form, quantita: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-stone-700">Data</label><input type="date" className={inputCls} value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50">Annulla</button>
            <button onClick={registra} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">Registra</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
