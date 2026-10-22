"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthUser, getCurrentUser, logout } from "@/lib/auth";

type NavItem = { href: string; label: string };

const publicLinks: NavItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/jornadas", label: "Jornadas" },
  { href: "/clasificacion", label: "Clasificación" },
  { href: "/premios", label: "Premios" },
];

const playerLinks: NavItem[] = [
  { href: "/pronosticos", label: "Mis pronósticos" },
  { href: "/pronosticos/resultados", label: "Mis resultados" },
  { href: "/pago", label: "Mi pago" },
];

// Los controles de partidos, participantes, pagos y puntuación
// se encuentran dentro del detalle de cada torneo.
const adminLinks: NavItem[] = [
  { href: "/admin/tournaments", label: "Administrar Pollas" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setMobileOpen(false);
  }, [pathname]);

  const isAdmin = user?.role === "ADMIN";
  const isPlayer = user?.role === "PLAYER";
  const roleLinks = isAdmin ? adminLinks : isPlayer ? playerLinks : [];
  const roleTitle = isAdmin ? "Administración" : "Mi juego";

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    // Evita marcar "Mis pronósticos" al visitar "Mis resultados".
    if (href === "/pronosticos") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleLogout() {
    logout();
    setUser(null);
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  function linkStyle(href: string, mobile = false) {
    const base = mobile
      ? "block rounded-xl px-4 py-3 text-sm font-semibold transition"
      : "block rounded-xl px-3 py-2 text-sm font-semibold transition";
    return `${base} ${isActive(href)
      ? "bg-red-600/20 text-red-400"
      : "text-slate-200 hover:bg-white/10 hover:text-red-400"}`;
  }

  return (
    <>
      <nav aria-label="Navegación principal" className="hidden items-center gap-1 xl:flex">
        {publicLinks.map((item) => (
          <Link key={item.href} href={item.href} className={linkStyle(item.href)}
            aria-current={isActive(item.href) ? "page" : undefined}>
            {item.label}
          </Link>
        ))}

        {user && (
          <details key={`desktop-${pathname}`} className="group relative">
            <summary className={`cursor-pointer list-none rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-white/10 hover:text-red-400 [&::-webkit-details-marker]:hidden ${roleLinks.some((item) => isActive(item.href)) || (isAdmin && pathname.startsWith("/admin/")) ? "bg-red-600/20 text-red-400" : "text-slate-200"}`}>
              {roleTitle} <span aria-hidden="true" className="ml-1 text-xs">▾</span>
            </summary>
            <div className="absolute right-0 top-full z-[60] mt-3 w-60 rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl">
              {roleLinks.map((item) => (
                <Link key={item.href} href={item.href} className={linkStyle(item.href)}
                  aria-current={isActive(item.href) ? "page" : undefined}>
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <p className="border-t border-slate-800 px-3 py-2 text-xs leading-relaxed text-slate-400">
                  Selecciona una Polla para gestionar partidos, participantes, pagos, puntuación y ranking.
                </p>
              )}
            </div>
          </details>
        )}

        {user ? (
          <>
            <div className="ml-2 min-w-0 border-l border-slate-700 pl-4 text-right">
              <p className="max-w-32 truncate text-sm font-bold text-white" title={user.name}>{user.name}</p>
              <p className="text-xs text-slate-400">{isAdmin ? "Administrador" : "Jugador"}</p>
            </div>
            <button type="button" onClick={handleLogout}
              className="ml-2 rounded-xl border border-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600">
              Salir
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="ml-2 rounded-xl border border-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600">Ingresar</Link>
            <Link href="/register" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700">Registrarse</Link>
          </>
        )}
      </nav>

      <button type="button" aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        aria-controls="pollamix-mobile-menu" aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-white transition hover:border-red-500 xl:hidden">
        <span className="text-2xl leading-none" aria-hidden="true">{mobileOpen ? "×" : "☰"}</span>
      </button>

      {mobileOpen && (
        <div id="pollamix-mobile-menu" className="absolute left-4 right-4 top-[84px] z-[60] max-h-[calc(100vh-100px)] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl xl:hidden">
          <nav aria-label="Navegación móvil" className="flex flex-col gap-1">
            {publicLinks.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={linkStyle(item.href, true)}>{item.label}</Link>
            ))}
            {user && (
              <>
                <p className="mt-3 border-t border-slate-800 px-4 pt-4 text-xs font-bold uppercase tracking-widest text-red-400">{roleTitle}</p>
                {roleLinks.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={linkStyle(item.href, true)}>{item.label}</Link>
                ))}
                {isAdmin && <p className="px-4 py-2 text-xs text-slate-400">Abre una Polla para administrar partidos, participantes, pagos, puntuación y ranking.</p>}
              </>
            )}
            {user ? (
              <>
                <div className="mt-3 border-t border-slate-800 px-4 pt-4">
                  <p className="font-bold text-white">{user.name}</p>
                  <p className="text-xs text-slate-400">{isAdmin ? "Administrador" : "Jugador"}</p>
                </div>
                <button type="button" onClick={handleLogout} className="mt-2 rounded-xl border border-red-600 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-red-600">Salir</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className={linkStyle("/login", true)}>Ingresar</Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">Registrarse</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
