import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e password sono obbligatori" },
        { status: 400 }
      );
    }

    const utente = await prisma.utente.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!utente || !utente.attivo) {
      return NextResponse.json(
        { error: "Credenziali non valide" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, utente.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Credenziali non valide" },
        { status: 401 }
      );
    }

    const token = signToken({
      id: utente.id,
      email: utente.email,
      nome: utente.nome,
      ruolo: utente.ruolo,
      puntoVenditaId: utente.puntoVenditaId,
    });

    const response = NextResponse.json({
      user: {
        id: utente.id,
        email: utente.email,
        nome: utente.nome,
        ruolo: utente.ruolo,
        puntoVenditaId: utente.puntoVenditaId,
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 giorni
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
