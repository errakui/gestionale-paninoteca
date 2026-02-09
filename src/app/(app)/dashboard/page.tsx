"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import {
  Store,
  Package,
  ChefHat,
  ShoppingCart,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  TrendingUp,
} from "lucide-react";

interface DashboardData {
  stats: { puntiVendita: number; prodotti: number; ricette: number; venditeOggi: number };
  sottoSoglia: { prodotto: string; puntoVendita: string; quantita: number; soglia: number; unita: string }[];
  venditePerPV: { nome: string; vendite: number }[];
  topRicette: { nome: string; count: number }[];
  movimentiRecenti: { id: string; tipo: string; quantita: number; prodotto: string; puntoVendita: string; data: string; note: string | null }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
        <p className="text-stone-500">Impossibile caricare la dashboard. Verifica la connessione al database.</p>
      </div>
    );
  }

  const statCards = [
    { label: "Punti Vendita", value: data.stats.puntiVendita, icon: Store, color: "bg-blue-50 text-blue-600" },
    { label: "Prodotti", value: data.stats.prodotti, icon: Package, color: "bg-amber-50 text-amber-600" },
    { label: "Ricette", value: data.stats.ricette, icon: ChefHat, color: "bg-green-50 text-green-600" },
    { label: "Vendite Oggi", value: data.stats.venditeOggi, icon: ShoppingCart, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Panoramica del gestionale" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">{s.label}</p>
                <p className="mt-1 text-2xl font-bold text-stone-900">{s.value}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${s.color}`}>
                <s.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sotto soglia */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h3 className="font-semibold text-stone-900">Prodotti Sotto Soglia</h3>
          </div>
          {data.sottoSoglia.length === 0 ? (
            <p className="text-sm text-stone-400">Nessun prodotto sotto soglia</p>
          ) : (
            <div className="space-y-2">
              {data.sottoSoglia.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{item.prodotto}</p>
                    <p className="text-xs text-stone-500">{item.puntoVendita}</p>
                  </div>
                  <p className="text-sm font-bold text-red-600">{item.quantita} / {item.soglia} {item.unita}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top ricette */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-amber-600" />
            <h3 className="font-semibold text-stone-900">Top Ricette (7 giorni)</h3>
          </div>
          {data.topRicette.length === 0 ? (
            <p className="text-sm text-stone-400">Nessuna vendita registrata</p>
          ) : (
            <div className="space-y-3">
              {data.topRicette.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">{i + 1}</span>
                    <span className="text-sm font-medium text-stone-800">{r.nome}</span>
                  </div>
                  <span className="text-sm font-bold text-stone-700">{r.count} venduti</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vendite per PV */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Store size={18} className="text-blue-600" />
            <h3 className="font-semibold text-stone-900">Vendite per Sede (7 giorni)</h3>
          </div>
          {data.venditePerPV.length === 0 ? (
            <p className="text-sm text-stone-400">Nessuna vendita registrata</p>
          ) : (
            <div className="space-y-3">
              {data.venditePerPV.map((pv, i) => {
                const max = Math.max(...data.venditePerPV.map((p) => p.vendite));
                const pct = max > 0 ? (pv.vendite / max) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-stone-700">{pv.nome}</span>
                      <span className="font-bold text-stone-900">{pv.vendite}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-stone-100">
                      <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Movimenti recenti */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-stone-900">Ultimi Movimenti</h3>
          {data.movimentiRecenti.length === 0 ? (
            <p className="text-sm text-stone-400">Nessun movimento registrato</p>
          ) : (
            <div className="space-y-2">
              {data.movimentiRecenti.slice(0, 8).map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-50">
                  <div className={`rounded-full p-1 ${m.tipo === "CARICO" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {m.tipo === "CARICO" ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-stone-800">{m.prodotto}</p>
                    <p className="text-xs text-stone-400">{m.puntoVendita}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${m.tipo === "CARICO" ? "text-green-600" : "text-red-600"}`}>
                      {m.tipo === "CARICO" ? "+" : "-"}{m.quantita}
                    </p>
                    <p className="text-xs text-stone-400">{new Date(m.data).toLocaleDateString("it-IT")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
