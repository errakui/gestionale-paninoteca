"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, LogIn, Eye, EyeOff } from "lucide-react";

const DEMO_CREDENTIALS = [
  {
    label: "Admin (Titolare)",
    description: "Accesso completo a tutti i punti vendita",
    email: "admin@daddysburger.it",
    password: "admin123",
    color: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
  {
    label: "Responsabile Centro",
    description: "Gestione Paninoteca Centro",
    email: "centro@daddysburger.it",
    password: "centro123",
    color: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    label: "Responsabile Stazione",
    description: "Gestione Paninoteca Stazione",
    email: "stazione@daddysburger.it",
    password: "stazione123",
    color: "bg-green-50 border-green-200",
    badge: "bg-green-100 text-green-700",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Errore durante il login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Errore di connessione al server");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (cred: (typeof DEMO_CREDENTIALS)[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError("");
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Colonna sinistra - Branding */}
      <div className="hidden w-1/2 flex-col items-center justify-center bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 p-12 lg:flex">
        <div className="max-w-md text-center">
          <Image
            src="/logo.png"
            alt="Daddy's Burger"
            width={280}
            height={78}
            className="mx-auto mb-8 brightness-0 invert"
            priority
          />
          <h2 className="mb-4 text-2xl font-bold text-white">
            Gestionale Magazzino
          </h2>
          <p className="text-base text-stone-300 leading-relaxed">
            Gestisci i tuoi punti vendita, controlla il magazzino in tempo reale,
            monitora vendite e consumi. Tutto da un&apos;unica piattaforma.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold text-amber-400">Multi</p>
              <p className="mt-1 text-xs text-stone-300">Punti Vendita</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold text-amber-400">Real</p>
              <p className="mt-1 text-xs text-stone-300">Time Stock</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
              <p className="text-2xl font-bold text-amber-400">Auto</p>
              <p className="mt-1 text-xs text-stone-300">Scarico</p>
            </div>
          </div>
        </div>
      </div>

      {/* Colonna destra - Form */}
      <div className="flex w-full flex-col items-center justify-center bg-stone-50 px-6 py-10 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/logo.png"
              alt="Daddy's Burger"
              width={200}
              height={56}
              priority
            />
          </div>

          <h1 className="mb-1 text-2xl font-bold text-stone-900">Accedi</h1>
          <p className="mb-6 text-sm text-stone-500">
            Inserisci le tue credenziali per accedere al gestionale
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                placeholder="email@daddysburger.it"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 pr-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  placeholder="La tua password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>

          {/* Credenziali demo */}
          <div className="mt-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-stone-50 px-3 text-stone-400 uppercase tracking-wider font-medium">
                  Credenziali Demo
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {DEMO_CREDENTIALS.map((cred) => (
                <div
                  key={cred.email}
                  className={`rounded-xl border p-4 ${cred.color} transition-all hover:shadow-sm`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cred.badge}`}>
                        {cred.label}
                      </span>
                    </div>
                    <button
                      onClick={() => fillCredentials(cred)}
                      className="rounded-lg bg-white/80 px-3 py-1 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:bg-white"
                    >
                      Usa queste
                    </button>
                  </div>
                  <p className="mb-2 text-xs text-stone-500">{cred.description}</p>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between rounded-md bg-white/60 px-3 py-1.5">
                      <span className="text-xs text-stone-600">
                        <span className="font-medium text-stone-400 mr-1">Email:</span>
                        {cred.email}
                      </span>
                      <button
                        onClick={() => copyToClipboard(cred.email, `email-${cred.email}`)}
                        className="ml-2 rounded p-0.5 text-stone-400 hover:text-stone-600"
                        title="Copia email"
                      >
                        {copied === `email-${cred.email}` ? (
                          <Check size={13} className="text-green-600" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-white/60 px-3 py-1.5">
                      <span className="text-xs text-stone-600">
                        <span className="font-medium text-stone-400 mr-1">Pass:</span>
                        {cred.password}
                      </span>
                      <button
                        onClick={() => copyToClipboard(cred.password, `pass-${cred.email}`)}
                        className="ml-2 rounded p-0.5 text-stone-400 hover:text-stone-600"
                        title="Copia password"
                      >
                        {copied === `pass-${cred.email}` ? (
                          <Check size={13} className="text-green-600" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
