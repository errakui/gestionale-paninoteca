"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import {
  Plug,
  Monitor,
  Receipt,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

export default function IntegrazioniPage() {
  return (
    <>
      <PageHeader
        title="Integrazioni"
        description="Configurazione sistemi esterni e collegamenti"
      />

      <div className="space-y-6">
        {/* 1. Velocissimo – Incassi (scraping) */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-stone-100 p-2.5 text-stone-600">
                <Monitor size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">Velocissimo – Incassi</h3>
                <p className="mt-0.5 text-sm text-stone-500">
                  Sincronizzazione incassi da admin.velocissimo.app (Sorrento). Aggiornamento ogni 6 min.
                </p>
              </div>
            </div>
            <Link
              href="/integrazioni/velocissimo"
              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              Configura <ChevronRight size={16} />
            </Link>
          </div>
          <div className="border-t border-stone-100 pt-4">
            <p className="text-sm text-stone-600">
              Script di scraping: login sul portale, selezione sede Sorrento, estrazione incassi e invio al gestionale. Pagina dedicata: stato sync e automazione in cloud (Railway/Render).
            </p>
          </div>
        </div>

        {/* 2. CGN Fatturazione */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-stone-100 p-2.5 text-stone-600">
                <Receipt size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">CGN Fatturazione</h3>
                <p className="mt-0.5 text-sm text-stone-500">
                  Controllo automatico prezzi acquisto materie prime e alert aumenti
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
              <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
              Da valutare
            </span>
          </div>
          <div className="border-t border-stone-100 pt-4">
            <p className="mb-4 text-sm text-stone-600">
              Import fatture, confronto prezzi con listini e alert automatici in caso di aumenti.
            </p>
            <button className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50">
              Richiedi informazioni
            </button>
          </div>
        </div>

        {/* 3. WhatsApp Business */}
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2.5 text-green-600">
                <MessageCircle size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">WhatsApp Business</h3>
                <p className="mt-0.5 text-sm text-stone-500">
                  Invio automatico ordini giornalieri ai fornitori
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Attivo
            </span>
          </div>
          <div className="space-y-4 border-t border-stone-100 pt-4">
            <p className="text-sm text-stone-600">
              Gli ordini vengono inviati tramite link WhatsApp Web. Per automazione completa,
              configurare WhatsApp Business API.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Prefisso internazionale predefinito
              </label>
              <input
                type="text"
                className={inputCls}
                placeholder="+39"
                defaultValue="+39"
                maxLength={5}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
