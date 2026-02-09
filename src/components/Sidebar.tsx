"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Store,
  Package,
  Warehouse,
  ChefHat,
  ShoppingCart,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Punti Vendita", href: "/punti-vendita", icon: Store },
  { name: "Prodotti", href: "/prodotti", icon: Package },
  { name: "Magazzino", href: "/magazzino", icon: Warehouse },
  { name: "Ricette", href: "/ricette", icon: ChefHat },
  { name: "Vendite", href: "/vendite", icon: ShoppingCart },
];

interface UserInfo {
  nome: string;
  email: string;
  ruolo: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const ruoloLabel: Record<string, string> = {
    ADMIN: "Amministratore",
    RESPONSABILE: "Responsabile",
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-stone-900 p-2 text-white shadow-lg md:hidden"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 flex h-screen w-64 flex-col bg-stone-900 text-white transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-center border-b border-white/10 px-4">
          <Image
            src="/logo.png"
            alt="Daddy's Burger Logo"
            width={160}
            height={44}
            className="brightness-0 invert"
            priority
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-stone-300 hover:bg-stone-800 hover:text-white"
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-white/10 p-3">
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-lg bg-stone-800 px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold">
                <User size={14} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.nome}</p>
                <p className="truncate text-xs text-stone-400">
                  {ruoloLabel[user.ruolo] || user.ruolo}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-400 transition-colors hover:bg-stone-800 hover:text-red-400"
          >
            <LogOut size={16} />
            Esci
          </button>
        </div>
      </aside>
    </>
  );
}
