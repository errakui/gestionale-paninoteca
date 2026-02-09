"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { Plus, ShoppingCart } from "lucide-react";

interface PuntoVendita {
  id: string;
  nome: string;
}

interface Ricetta {
  id: string;
  nome: string;
  prezzo: number;
  attiva: boolean;
}

interface VenditaItem {
  id: string;
  quantita: number;
  data: string;
  ricetta: { nome: string; prezzo: number };
  puntoVendita: { nome: string };
}

export default function VenditePage() {
  const [puntiVendita, setPuntiVendita] = useState<PuntoVendita[]>([]);
  const [ricette, setRicette] = useState<Ricetta[]>([]);
  const [vendite, setVendite] = useState<VenditaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pvSelezionato, setPvSelezionato] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    ricettaId: "",
    quantita: "1",
    data: new Date().toISOString().split("T")[0],
  });

  const loadBase = async () => {
    const [pvRes, rRes] = await Promise.all([
      fetch("/api/punti-vendita").then((r) => r.json()),
      fetch("/api/ricette").then((r) => r.json()),
    ]);
    setPuntiVendita(pvRes);
    setRicette(rRes.filter((r: Ricetta) => r.attiva));
    if (pvRes.length > 0 && !pvSelezionato) {
      setPvSelezionato(pvRes[0].id);
    }
    setLoading(false);
  };

  const loadVendite = async () => {
    if (!pvSelezionato) return;
    const res = await fetch(`/api/vendite?puntoVenditaId=${pvSelezionato}`);
    setVendite(await res.json());
  };

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { if (pvSelezionato) loadVendite(); }, [pvSelezionato]);

  const registraVendita = async () => {
    if (!form.ricettaId || !pvSelezionato) return;
    await fetch("/api/vendite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, puntoVenditaId: pvSelezionato }),
    });
    setModal(false);
    setForm({ ricettaId: "", quantita: "1", data: new Date().toISOString().split("T")[0] });
    loadVendite();
  };

  // Raggruppa per data
  const venditePerData: Record<string, VenditaItem[]> = {};
  for (const v of vendite) {
    const dataKey = new Date(v.data).toLocaleDateString("it-IT");
    if (!venditePerData[dataKey]) venditePerData[dataKey] = [];
    venditePerData[dataKey].push(v);
  }

  return (
    <>
      <PageHeader
        title="Vendite"
        description="Registra vendite giornaliere con scarico automatico dal magazzino"
        action={
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            <Plus size={16} /> Registra Vendita
          </button>
        }
      />

      {/* Selettore PV */}
      <div className="mb-6">
        <select
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium focus:border-primary focus:outline-none"
          value={pvSelezionato}
          onChange={(e) => setPvSelezionato(e.target.value)}
        >
          {puntiVendita.map((pv) => (
            <option key={pv.id} value={pv.id}>{pv.nome}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : vendite.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <ShoppingCart size={40} className="mx-auto mb-3 text-muted" />
          <p className="font-medium">Nessuna vendita registrata</p>
          <p className="mt-1 text-sm text-muted">Registra la prima vendita per iniziare il tracciamento</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(venditePerData).map(([data, items]) => {
            const totaleGiorno = items.reduce((sum, v) => sum + v.ricetta.prezzo * v.quantita, 0);
            const totPezzi = items.reduce((sum, v) => sum + v.quantita, 0);
            return (
              <div key={data}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{data}</h3>
                  <div className="flex gap-3 text-sm">
                    <span className="text-muted">{totPezzi} pezzi</span>
                    <span className="font-bold text-primary">{totaleGiorno.toFixed(2)} &euro;</span>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-alt text-left">
                        <th className="px-4 py-2 font-medium">Ricetta</th>
                        <th className="px-4 py-2 font-medium text-center">Quantità</th>
                        <th className="px-4 py-2 font-medium text-right">Prezzo Unit.</th>
                        <th className="px-4 py-2 font-medium text-right">Totale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((v) => (
                        <tr key={v.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 font-medium">{v.ricetta.nome}</td>
                          <td className="px-4 py-2 text-center">{v.quantita}</td>
                          <td className="px-4 py-2 text-right text-muted">{v.ricetta.prezzo.toFixed(2)} &euro;</td>
                          <td className="px-4 py-2 text-right font-bold">{(v.ricetta.prezzo * v.quantita).toFixed(2)} &euro;</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuova vendita */}
      <Modal open={modal} onClose={() => setModal(false)} title="Registra Vendita">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Ricetta / Panino *</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={form.ricettaId}
              onChange={(e) => setForm({ ...form, ricettaId: e.target.value })}
            >
              <option value="">Seleziona ricetta</option>
              {ricette.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome} — {r.prezzo.toFixed(2)} &euro;
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Quantità</label>
              <input
                type="number"
                min="1"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.quantita}
                onChange={(e) => setForm({ ...form, quantita: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Data</label>
              <input
                type="date"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-alt">Annulla</button>
            <button onClick={registraVendita} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
              Registra
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
