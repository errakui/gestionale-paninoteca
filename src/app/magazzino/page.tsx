"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { ArrowDown, ArrowUp, History, AlertTriangle, Warehouse } from "lucide-react";

interface PuntoVendita {
  id: string;
  nome: string;
}

interface Prodotto {
  id: string;
  nome: string;
  unitaMisura: string;
  sogliaMinima: number;
}

interface GiacenzaItem {
  id: string;
  quantita: number;
  prodotto: Prodotto;
  puntoVendita: PuntoVendita;
}

interface MovimentoItem {
  id: string;
  tipo: string;
  quantita: number;
  note: string | null;
  createdAt: string;
  prodotto: { nome: string };
  puntoVendita: { nome: string };
}

export default function MagazzinoPage() {
  const [puntiVendita, setPuntiVendita] = useState<PuntoVendita[]>([]);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [giacenze, setGiacenze] = useState<GiacenzaItem[]>([]);
  const [movimenti, setMovimenti] = useState<MovimentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pvSelezionato, setPvSelezionato] = useState("");
  const [modal, setModal] = useState(false);
  const [showMovimenti, setShowMovimenti] = useState(false);
  const [form, setForm] = useState({
    tipo: "CARICO" as "CARICO" | "SCARICO",
    prodottoId: "",
    quantita: "1",
    note: "",
  });

  const loadAll = async () => {
    setLoading(true);
    const [pvRes, prRes] = await Promise.all([
      fetch("/api/punti-vendita").then((r) => r.json()),
      fetch("/api/prodotti").then((r) => r.json()),
    ]);
    setPuntiVendita(pvRes);
    setProdotti(prRes);
    if (pvRes.length > 0 && !pvSelezionato) {
      setPvSelezionato(pvRes[0].id);
    }
    setLoading(false);
  };

  const loadGiacenze = async () => {
    if (!pvSelezionato) return;
    const [gRes, mRes] = await Promise.all([
      fetch(`/api/magazzino?puntoVenditaId=${pvSelezionato}`).then((r) => r.json()),
      fetch(`/api/magazzino/movimenti?puntoVenditaId=${pvSelezionato}&limit=30`).then((r) => r.json()),
    ]);
    setGiacenze(gRes);
    setMovimenti(mRes);
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (pvSelezionato) loadGiacenze(); }, [pvSelezionato]);

  const registraMovimento = async () => {
    if (!form.prodottoId || !pvSelezionato) return;
    await fetch("/api/magazzino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, puntoVenditaId: pvSelezionato }),
    });
    setModal(false);
    setForm({ tipo: "CARICO", prodottoId: "", quantita: "1", note: "" });
    loadGiacenze();
  };

  return (
    <>
      <PageHeader
        title="Magazzino"
        description="Giacenze, carichi e scarichi per punto vendita"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowMovimenti(!showMovimenti)}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-alt"
            >
              <History size={16} /> Storico
            </button>
            <button
              onClick={() => setModal(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              <ArrowDown size={16} /> Registra Movimento
            </button>
          </div>
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
      ) : giacenze.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <Warehouse size={40} className="mx-auto mb-3 text-muted" />
          <p className="font-medium">Magazzino vuoto</p>
          <p className="mt-1 text-sm text-muted">Registra il primo carico per vedere le giacenze</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left">
                <th className="px-4 py-3 font-medium">Prodotto</th>
                <th className="px-4 py-3 font-medium">Unità</th>
                <th className="px-4 py-3 font-medium text-right">Giacenza</th>
                <th className="px-4 py-3 font-medium text-right">Soglia Min.</th>
                <th className="px-4 py-3 font-medium text-center">Stato</th>
              </tr>
            </thead>
            <tbody>
              {giacenze.map((g) => {
                const sottoSoglia = g.prodotto.sogliaMinima > 0 && g.quantita <= g.prodotto.sogliaMinima;
                return (
                  <tr key={g.id} className={`border-b border-border last:border-0 ${sottoSoglia ? "bg-red-50/50" : "hover:bg-surface-alt/50"}`}>
                    <td className="px-4 py-3 font-medium">{g.prodotto.nome}</td>
                    <td className="px-4 py-3 text-muted">{g.prodotto.unitaMisura}</td>
                    <td className="px-4 py-3 text-right font-bold">{g.quantita}</td>
                    <td className="px-4 py-3 text-right text-muted">{g.prodotto.sogliaMinima}</td>
                    <td className="px-4 py-3 text-center">
                      {sottoSoglia ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-danger">
                          <AlertTriangle size={12} /> Sotto soglia
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Storico movimenti */}
      {showMovimenti && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 font-semibold">Storico Movimenti</h3>
          {movimenti.length === 0 ? (
            <p className="text-sm text-muted">Nessun movimento registrato</p>
          ) : (
            <div className="space-y-2">
              {movimenti.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-alt">
                  <div className={`rounded-full p-1.5 ${m.tipo === "CARICO" ? "bg-green-100 text-success" : "bg-red-100 text-danger"}`}>
                    {m.tipo === "CARICO" ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.prodotto.nome}</p>
                    {m.note && <p className="text-xs text-muted">{m.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${m.tipo === "CARICO" ? "text-success" : "text-danger"}`}>
                      {m.tipo === "CARICO" ? "+" : "-"}{m.quantita}
                    </p>
                    <p className="text-xs text-muted">{new Date(m.createdAt).toLocaleString("it-IT")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal nuovo movimento */}
      <Modal open={modal} onClose={() => setModal(false)} title="Registra Movimento">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo</label>
            <div className="flex gap-2">
              <button
                onClick={() => setForm({ ...form, tipo: "CARICO" })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${form.tipo === "CARICO" ? "border-green-500 bg-green-50 text-green-700" : "border-border"}`}
              >
                <ArrowDown size={16} /> Carico
              </button>
              <button
                onClick={() => setForm({ ...form, tipo: "SCARICO" })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${form.tipo === "SCARICO" ? "border-red-500 bg-red-50 text-red-700" : "border-border"}`}
              >
                <ArrowUp size={16} /> Scarico
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Prodotto *</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={form.prodottoId}
              onChange={(e) => setForm({ ...form, prodottoId: e.target.value })}
            >
              <option value="">Seleziona prodotto</option>
              {prodotti.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} ({p.unitaMisura})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Quantità</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={form.quantita}
              onChange={(e) => setForm({ ...form, quantita: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Note</label>
            <input
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Es: Consegna fornitore XYZ"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-alt">Annulla</button>
            <button onClick={registraMovimento} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
              Registra
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
