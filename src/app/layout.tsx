import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daddy's Burger - Gestionale",
  description: "Software gestione magazzino multi-punto vendita per Daddy's Burger",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
