"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import PhoneField from "@/components/PhoneField";
import { DEFAULT_COUNTRY_ISO } from "@/lib/country-codes";
import { composePhone, splitPhone } from "@/lib/phone";

type Profile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "PLAYER" | "ADMIN";
  rulesAcceptedAt: string | null;
  rulesVersion: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      const api = process.env.NEXT_PUBLIC_API_URL;

      if (!api) {
        if (active) {
          setError("La API no está configurada.");
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(
          `${api.replace(/\/$/, "")}/users/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("No fue posible consultar tu perfil.");
        }

        const data: Profile = await response.json();

        if (active) {
          setProfile(data);
          const split = splitPhone(data.phone ?? "");
          setCountryIso(split.iso);
          setNational(split.national);
        }
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

    return () => {
      active = false;
    };
  }, [router]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const contactPhone = composePhone(countryIso, national);
    if (!contactPhone) {
      setError("Elige el país y escribe el celular, por ejemplo 300 123 4567.");
      return;
    }

    const token = getToken();
    const api = process.env.NEXT_PUBLIC_API_URL;

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!api) {
      setError("La API no está configurada.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${api.replace(/\/$/, "")}/users/me/phone`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ phone: contactPhone }),
        }
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("No fue posible actualizar el celular.");
      }

      const updated: Profile = await response.json();
      setProfile(updated);
      const split = splitPhone(contactPhone, countryIso);
      setCountryIso(split.iso);
      setNational(split.national);
      setSuccess("Celular actualizado correctamente.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#071321] px-5 py-14 text-white">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-sm text-red-400 hover:underline">
          ← Volver al inicio
        </Link>

        <h1 className="mt-10 text-3xl font-black">Mi perfil</h1>
        <p className="mt-2 text-slate-400">
          Actualiza tus datos de contacto para recibir información
          relacionada con tu participación y los premios.
        </p>

        {loading ? (
          <p className="mt-8 text-slate-300">Cargando perfil...</p>
        ) : (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-7">
            {error && (
              <p role="alert" className="mb-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </p>
            )}

            {success && (
              <p role="status" className="mb-5 rounded-xl bg-green-500/10 p-4 text-sm text-green-300">
                {success}
              </p>
            )}

            {profile && (
              <>
                <div className="space-y-5">
                  <div>
                    <p className="text-xs text-slate-400">Nombre</p>
                    <p className="mt-1 font-semibold">{profile.name}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Correo electrónico</p>
                    <p className="mt-1 font-semibold break-all">{profile.email}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Reglamento aceptado
                    </p>
                    <p className="mt-1 text-sm">
                      {profile.rulesVersion
                        ? `Versión ${profile.rulesVersion}`
                        : "Pendiente de aceptación"}
                    </p>
                  </div>
                </div>

                <form onSubmit={save} className="mt-8 border-t border-slate-800 pt-7">
                  <fieldset>
                    <legend className="mb-2 block text-sm font-semibold">
                      Celular de contacto
                    </legend>
                    <PhoneField
                      id="profile-phone"
                      countryIso={countryIso}
                      national={national}
                      onCountryIso={setCountryIso}
                      onNational={setNational}
                    />
                  </fieldset>

                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    Elige el código de tu país y escribe el número. Este
                    celular es privado y se utilizará para comunicaciones
                    relacionadas con el torneo y la entrega de premios.
                  </p>

                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-6 w-full rounded-xl bg-red-600 px-6 py-3 font-bold transition hover:bg-red-500 disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar celular"}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
