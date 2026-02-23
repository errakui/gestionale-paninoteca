"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { Wallet, FileSpreadsheet } from "lucide-react";

interface PuntoVendita {
  id: string;
  nome: string;
}

interface Incasso {
  id: string;
  data: string;
  importo: number;
  fonte: string;
  note: string | null;
  puntoVendita: { nome: string };
}

export default function IncassiPage() {
  const [pvList, setPvList] = useState<PuntoVendita[]>([]);
  const [pvSel, setPvSel] = useState("");
  const [incassi, setIncassi] = useState<Incasso[]>([]);
  const [loading, setLoading] = useState(true);
  const [cronLog, setCronLog] = useState<{ runAt: string; status: string; message: string | null } | null>(null);
  const [testRun, setTestRun] = useState<{ ok: boolean; message: string; steps?: { step: string; ok: boolean; detail?: string; screenshot?: string }[] } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const runSyncNow = async () => {
    setTestRun(null);
    setTestLoading(true);
    try {
      const r = await fetch("/api/cron/sync-velocissimo", {
        credentials: "include",
        headers: { "x-want-screenshots": "1" },
      });
      const data = await r.json().catch(() => ({}));
      const steps = Array.isArray(data.steps) ? data.steps : undefined;
      if (r.ok) {
        setTestRun({
          ok: true,
          message: data.count !== undefined ? `${data.count} incassi caricati` : (data.message || "Ok"),
          steps,
        });
        fetch("/api/velocissimo/cron-log").then((x) => x.json()).then(setCronLog).catch(() => {});
        loadIncassi();
      } else {
        setTestRun({ ok: false, message: data.error || "Errore " + r.status, steps });
      }
    } catch (e) {
      setTestRun({ ok: false, message: String(e) });
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/punti-vendita")
      .then((r) => r.json())
      .then((d) => {
        setPvList(d);
        if (d.length > 0 && !pvSel) setPvSel(d[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadIncassi = async () => {
    const url = pvSel ? `/api/incassi?puntoVenditaId=${pvSel}` : "/api/incassi";
    const res = await fetch(url);
    const data = await res.json();
    setIncassi(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadIncassi();
  }, [pvSel]);

  useEffect(() => {
    fetch("/api/velocissimo/cron-log")
      .then((r) => r.json())
      .then(setCronLog)
      .catch(() => setCronLog(null));
  }, []);

  const totale = incassi.reduce((s, i) => s + i.importo, 0);
  const perMese: Record<string, number> = {};
  incassi.forEach((i) => {
    const k = new Date(i.data).toISOString().slice(0, 7);
    perMese[k] = (perMese[k] || 0) + i.importo;
  });

  return (
    <>
      <PageHeader
        title="Incassi Velocissimo"
        description="Solo scraping: i dati arrivano da admin.velocissimo.app ogni 6 minuti (cron in cloud su Vercel)."
        action={
          <button
            onClick={runSyncNow}
            disabled={testLoading}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {testLoading ? "Esecuzione… (attendi 30–60 s)" : "Esegui sync ora"}
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium focus:border-amber-500 focus:outline-none"
          value={pvSel}
          onChange={(e) => setPvSel(e.target.value)}
        >
          <option value="">Tutti i punti vendita</option>
          {pvList.map((pv) => (
            <option key={pv.id} value={pv.id}>
              {pv.nome}
            </option>
          ))}
        </select>
        <p className="text-sm text-stone-500">
          Sync automatico ogni 6 min. Se non vedi dati, controlla qui sotto o in Integrazioni → Velocissimo.
        </p>
      </div>

      {testRun && (
        <div className={`mb-4 rounded-lg border p-3 ${testRun.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <p className="text-sm font-medium text-stone-700">Risultato &quot;Esegui sync ora&quot;</p>
          <p className={`text-sm font-medium ${testRun.ok ? "text-green-700" : "text-red-700"}`}>{testRun.message}</p>
          {testRun.steps && testRun.steps.length > 0 && (
            <div className="mt-3 border-t border-stone-200 pt-2">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">Passaggi eseguiti + cosa vede Chrome</p>
              <ol className="list-decimal space-y-3 pl-5 text-sm">
                {testRun.steps.map((s, i) => (
                  <li key={i} className={s.ok ? "text-stone-700" : "text-red-700 font-medium"}>
                    {s.step}
                    {s.detail != null && <span className="text-stone-600"> — {s.detail}</span>}
                    {s.ok ? " ✓" : " ✗"}
                    {s.screenshot && (
                      <div className="mt-1.5">
                        <img
                          src={`data:image/jpeg;base64,${s.screenshot}`}
                          alt={s.step}
                          className="max-w-full rounded border border-stone-200"
                          style={{ maxHeight: "320px" }}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {cronLog && (
        <div className={`mb-4 rounded-lg border p-3 ${cronLog.status === "OK" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          <p className="text-sm font-medium text-stone-700">Ultimo run cron</p>
          <p className="text-sm text-stone-800">
            {new Date(cronLog.runAt).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            {" — "}
            {cronLog.status === "OK" ? <span className="text-green-700">{cronLog.message}</span> : <span className="text-red-700">{cronLog.message}</span>}
          </p>
          <Link href="/integrazioni/velocissimo" className="mt-1 inline-block text-xs text-amber-600 hover:underline">Dettaglio e variabili →</Link>
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-stone-500">
                <Wallet size={18} />
                <span className="text-sm font-medium">Totale</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-stone-900">
                €{totale.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-stone-400">{incassi.length} giorni</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-stone-500">
                <FileSpreadsheet size={18} />
                <span className="text-sm font-medium">Media giornaliera</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-stone-900">
                €{incassi.length ? (totale / incassi.length).toLocaleString("it-IT", { minimumFractionDigits: 2 }) : "0,00"}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <span className="text-sm font-medium text-stone-500">Ultimo mese</span>
              <p className="mt-1 text-2xl font-bold text-stone-900">
                €{Object.values(perMese).slice(0, 1).reduce((a, b) => a + b, 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-left">
                  <th className="px-4 py-3 font-medium text-stone-600">Data</th>
                  <th className="px-4 py-3 font-medium text-stone-600">Importo</th>
                  <th className="px-4 py-3 font-medium text-stone-600">Sede</th>
                </tr>
              </thead>
              <tbody>
                {incassi.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-stone-500">
                      Nessun incasso ancora. Il cron (scraping in cloud su Vercel) gira ogni 6 minuti. Controlla Integrazioni → Velocissimo per l’ultimo sync.
                    </td>
                  </tr>
                ) : (
                  incassi.map((i) => (
                    <tr key={i.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50">
                      <td className="px-4 py-3 font-medium text-stone-900">
                        {new Date(i.data).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 font-bold text-green-700">
                        €{i.importo.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{i.puntoVendita.nome}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
