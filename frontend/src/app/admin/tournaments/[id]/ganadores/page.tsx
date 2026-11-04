"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";

type Winner = {
  userId: number;
  position: number | null;
  order: number;
  points: number | null;
  amountCOP: number | null;
  name: string;
  email: string;
  phone: string | null;
};

type ResponseData = {
  tournamentId: number;
  finalized: boolean;
  closedAt?: string;
  currency?: string;
  winners: Winner[];
  message?: string;
};

export default function GanadoresPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const token = getToken();
      const api = process.env.NEXT_PUBLIC_API_URL;

      if (!token) {
        router.replace("/login");
        return;
      }

      if (!api || !/^[1-9]\d*$/.test(id)) {
        setError("Configuración o torneo inválido.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${api.replace(/\/$/, "")}/tournaments/${id}/winners/contacts`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (response.status === 403) {
          throw new Error(
            "No tienes permisos administrativos para consultar estos contactos."
          );
        }

        if (!response.ok) {
          throw new Error("No fue posible consultar los ganadores.");
        }

        const result: ResponseData = await response.json();
        if (active) setData(result);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Error de conexión."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [id, router]);

  const money = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <main className="min-h-screen bg-[#071321] px-5 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/admin/tournaments/${id}`}
          className="text-sm text-red-400 hover:underline"
        >
          ← Volver al torneo
        </Link>

        <h1 className="mt-9 text-3xl font-black">
          Contacto de ganadores
        </h1>

        <p className="mt-3 text-slate-400">
          Información privada para contactar a los participantes
          con premios definitivos.
        </p>

        {loading && (
          <p className="mt-8 text-slate-300">Consultando ganadores...</p>
        )}

        {error && (
          <p role="alert" className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
            {error}
          </p>
        )}

        {!loading && data && !data.finalized && (
          <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6">
            Este torneo todavía no tiene ganadores definitivos.
          </div>
        )}

        {data?.finalized && (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-green-400">
              Premios definitivos registrados.
              Contactos visibles solo para administradores.
            </p>

            {data.winners.length === 0 && (
              <p className="text-slate-300">
                No hay ganadores para contactar.
              </p>
            )}

            {data.winners.map((winner, index) => (
              <article
                key={`${winner.userId}-${index}`}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-red-400">
                  {winner.position !== null
                    ? `Puesto ${winner.position}`
                    : `Premiado ${winner.order}`}
                </p>

                <h2 className="mt-3 text-xl font-bold">
                  {winner.name}
                </h2>

                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <p>Correo: {winner.email}</p>
                  <p>
                    Celular:{" "}
                    {winner.phone ?? "Pendiente de actualizar"}
                  </p>
                  {winner.amountCOP !== null && (
                    <p className="font-semibold text-white">
                      Premio: {money(winner.amountCOP)}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={`mailto:${winner.email}`}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500"
                  >
                    Enviar correo
                  </a>

                  {winner.phone && (
                    <a
                      href={`tel:${winner.phone}`}
                      className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
                    >
                      Llamar
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
