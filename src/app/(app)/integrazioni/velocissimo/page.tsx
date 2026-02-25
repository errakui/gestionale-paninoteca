"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import {
  Monitor,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface SyncItem {
  id: string;
  ultimoSync: string;
  ultimiCount: number;
  puntoVendita: { id: string; nome: string };
}

interface CronLog {
  runAt: string;
  status: string;
  message: string | null;
}

interface AnalyticsRow {
  id: string;
  day: string;
  storeValue?: string;
  storeText: string | null;
  origins: string[] | null;
  types: string[] | null;
  metrics: Record<string, { current: string | null; previous: string | null; delta: string | null; sign: string | null }>;
  updatedAt: string;
}

export default function VelocissimoPage() {
  const [syncs, setSyncs] = useState<SyncItem[]>([]);
  const [cronLog, setCronLog] = useState<CronLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [testRun, setTestRun] = useState<{ ok: boolean; message: string; steps?: { step: string; ok: boolean; detail?: string; screenshot?: string }[] } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsRow[]>([]);

  useEffect(() => {
    fetch("/api/velocissimo/sync")
      .then((r) => r.json())
      .then(setSyncs)
      .catch(() => setSyncs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/velocissimo/cron-log")
      .then((r) => r.json())
      .then(setCronLog)
      .catch(() => setCronLog(null));
  }, []);

  useEffect(() => {
    fetch("/api/velocissimo/analytics-cache?limit=6")
      .then((r) => r.json())
      .then((d) => setAnalyticsRows(Array.isArray(d) ? d : []))
      .catch(() => setAnalyticsRows([]));
  }, []);

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
      if (r.ok && !data.useGitHubActions) {
        setTestRun({
          ok: true,
          message: data.queued
            ? (data.message || "Workflow GitHub avviato")
            : data.count !== undefined
              ? `${data.count} incassi caricati`
              : (data.message || "Ok"),
          steps,
        });
        fetch("/api/velocissimo/cron-log").then((x) => x.json()).then(setCronLog).catch(() => {});
        fetch("/api/velocissimo/sync").then((x) => x.json()).then(setSyncs).catch(() => {});
      } else if (data.useGitHubActions) {
        setTestRun({
          ok: false,
          message: data.message || "Su Vercel Chrome non è disponibile. Usa GitHub Actions (vedi sotto).",
          steps,
        });
      } else {
        setTestRun({ ok: false, message: data.error || "Errore " + r.status, steps });
      }
    } catch (e) {
      setTestRun({ ok: false, message: String(e) });
    } finally {
      setTestLoading(false);
    }
  };

  const hasSync = syncs.length > 0;

  return (
    <>
      <div className="mb-4">
        <Link
          href="/integrazioni"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-amber-600"
        >
          ← Torna a Integrazioni
        </Link>
      </div>

      <PageHeader
        title="Velocissimo – Incassi"
        description="Lo scraping gira su GitHub Actions ogni 6 minuti e salva i dati nel DB del tuo progetto Vercel."
        action={
          <button
            onClick={runSyncNow}
            disabled={testLoading}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {testLoading ? "Esecuzione… (attendi anche 30–60 s)" : "Esegui sync ora"}
          </button>
        }
      />

      <div className="space-y-6">
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-stone-100 p-2.5 text-stone-600">
              <Monitor size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">Stato</h3>
              <p className="text-sm text-stone-500">
                Portale: admin.velocissimo.app · Negozio: configurabile (Globale / singolo store)
              </p>
            </div>
            {hasSync ? (
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                <CheckCircle2 size={14} /> Sync attivo
              </span>
            ) : (
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                <Clock size={14} /> In attesa primo sync
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex h-16 items-center justify-center">
              <RefreshCw size={20} className="animate-spin text-stone-400" />
            </div>
          ) : hasSync ? (
            <div className="border-t border-stone-100 pt-4">
              <p className="mb-2 text-sm font-medium text-stone-700">Ultimo aggiornamento</p>
              <div className="flex flex-wrap gap-4">
                {syncs.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-2 text-sm"
                  >
                    <span className="font-medium text-stone-900">{s.puntoVendita.nome}</span>
                    <span className="mx-2 text-stone-400">·</span>
                    <span className="text-stone-600">
                      {new Date(s.ultimoSync).toLocaleString("it-IT", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="ml-2 text-stone-500">({s.ultimiCount} incassi)</span>
                  </div>
                ))}
              </div>
              <Link
                href="/incassi"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700"
              >
                Vedi incassi <ExternalLink size={14} />
              </Link>
            </div>
          ) : (
            <p className="border-t border-stone-100 pt-4 text-sm text-stone-500">
              Dopo il primo run del cron (ogni 6 min) qui comparirà l’ultimo sync.
            </p>
          )}

          {testRun && (
            <div className={`mt-4 rounded-lg border p-4 ${testRun.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <p className="text-sm font-medium text-stone-700">Risultato ultimo &quot;Esegui sync ora&quot;</p>
              <p className={`mt-1 text-sm font-medium ${testRun.ok ? "text-green-700" : "text-red-700"}`}>{testRun.message}</p>
              {testRun.steps && testRun.steps.length > 0 && (
                <div className="mt-4 border-t border-stone-200 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Passaggi eseguiti</p>
                  <ol className="list-decimal space-y-4 pl-5 text-sm">
                    {testRun.steps.map((s, i) => (
                      <li key={i} className={s.ok ? "text-stone-700" : "text-red-700 font-medium"}>
                        <span>{s.step}</span>
                        {s.detail != null && <span className="text-stone-600"> — {s.detail}</span>}
                        {s.ok ? " ✓" : " ✗"}
                        {s.screenshot && (
                          <div className="mt-2">
                            <p className="mb-1 text-xs font-medium text-stone-500">Cosa vede Chrome in questo passaggio:</p>
                            <img
                              src={`data:image/jpeg;base64,${s.screenshot}`}
                              alt={s.step}
                              className="max-w-full rounded border border-stone-200 shadow-sm"
                              style={{ maxHeight: "400px" }}
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
            <div className={`mt-4 rounded-lg border p-4 ${cronLog.status === "OK" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <p className="text-sm font-medium text-stone-700">Ultimo run del cron (automatico o da pulsante)</p>
              <p className="mt-1 text-sm text-stone-800">
                {new Date(cronLog.runAt).toLocaleString("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                {" — "}
                {cronLog.status === "OK" ? (
                  <span className="text-green-700">{cronLog.message ?? "Ok"}</span>
                ) : (
                  <span className="text-red-700">{cronLog.message ?? "Errore"}</span>
                )}
              </p>
            </div>
          )}

          {analyticsRows.length > 0 && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900">KPI dashboard salvati nel DB (oggi/ieri)</p>
              <div className="mt-3 space-y-3">
                {analyticsRows.slice(0, 2).map((row) => (
                  <div key={row.id} className="rounded border border-blue-100 bg-white p-3">
                    <p className="text-xs text-stone-600">
                      Giorno: <strong>{new Date(row.day).toLocaleDateString("it-IT")}</strong> · Negozio: <strong>{row.storeText ?? row.storeValue ?? "N/D"}</strong> · Aggiornato: {new Date(row.updatedAt).toLocaleString("it-IT")}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {["Numero ordini", "Totale venduto", "Scontrino medio", "Margine assoluto", "Coperti", "Coperto medio"].map((k) => (
                        <div key={k} className="rounded border border-stone-100 p-2">
                          <p className="text-xs text-stone-500">{k}</p>
                          <p className="text-sm font-semibold text-stone-900">{row.metrics?.[k]?.current ?? "N/D"}</p>
                          <p className="text-xs text-stone-500">Prev: {row.metrics?.[k]?.previous ?? "N/D"} · Δ {row.metrics?.[k]?.sign ?? ""}{row.metrics?.[k]?.delta ?? "N/D"}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <h3 className="font-semibold text-green-900">Dove gira lo sync</h3>
          <p className="mt-2 text-sm text-green-800">
            Lo scraping (login + tabella incassi) gira su <strong>GitHub Actions</strong> ogni 6 minuti. I dati vengono inviati a <code className="rounded bg-green-100 px-1">/api/incassi</code> sul gestionale (Vercel). Non serve un server tuo.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="mb-2 font-semibold text-amber-900">Sync con browser (Chrome) → GitHub Actions</h3>
          <p className="mb-3 text-sm text-amber-800">
            Su Vercel Chrome non può girare (librerie mancanti). Lo scraping va eseguito da <strong>GitHub Actions</strong>: ogni 6 minuti il workflow apre il portale, estrae gli incassi e li invia qui.
          </p>
          <p className="mb-2 text-sm font-medium text-amber-900">Cosa fare:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-amber-800">
            <li>Push del repo su GitHub (se non l’hai già fatto).</li>
            <li>Repo → <strong>Settings → Secrets and variables → Actions</strong> → aggiungi: <code className="rounded bg-amber-100 px-1">GESTIONALE_URL</code>, <code className="rounded bg-amber-100 px-1">VELOCISSIMO_EMAIL</code>, <code className="rounded bg-amber-100 px-1">VELOCISSIMO_PASSWORD</code>, <code className="rounded bg-amber-100 px-1">INCASSI_API_KEY</code>.</li>
            <li>Il workflow è in <code className="rounded bg-amber-100 px-1">.github/workflows/sync-velocissimo.yml</code>; parte ogni 6 minuti. Puoi lanciarlo anche a mano da Actions.</li>
          </ol>
          <p className="mt-3 text-xs text-amber-700">
            Istruzioni complete: <code className="rounded bg-amber-100 px-1">docs/sync-velocissimo-github-actions.md</code>
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 font-semibold text-stone-900">Variabili (Vercel + GitHub Secrets)</h3>
          <p className="mb-3 text-sm text-stone-600">
            Su Vercel servono almeno <strong>INCASSI_API_KEY</strong> (per ricevere i POST). Per lo scraping in GitHub Actions aggiungi i secrets come sopra.
          </p>
          <ul className="space-y-2 text-sm font-mono text-stone-700">
            <li><strong>VELOCISSIMO_EMAIL</strong> = email portale</li>
            <li><strong>VELOCISSIMO_PASSWORD</strong> = password portale</li>
            <li><strong>INCASSI_API_KEY</strong> = stessa chiave su Vercel e in GitHub secret</li>
            <li><strong>VELOCISSIMO_SEDE</strong> (opzionale) = testo da cliccare dopo login (default Sorrento)</li>
          </ul>
        </div>
      </div>
    </>
  );
}
