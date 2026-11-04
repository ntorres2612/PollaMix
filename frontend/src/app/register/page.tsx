"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Ingresa tu nombre completo.");
      return;
    }

    if (!/^3\d{9}$/.test(phone)) {
      setError("Ingresa un celular colombiano válido de 10 dígitos.");
      return;
    }

    if (password.length < 12) {
      setError("La contraseña debe tener al menos 12 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!accepted) {
      setError("Debes aceptar las reglas de participación.");
      return;
    }

    const api = process.env.NEXT_PUBLIC_API_URL;

    if (!api) {
      setError("No está configurada la conexión con el servidor.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${api.replace(/\/$/, "")}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: `+57${phone}`,
            acceptRules: accepted,
            password,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            "Demasiados intentos. Inténtalo nuevamente más tarde."
          );
        }

        if ([400, 409].includes(response.status)) {
          throw new Error(
            "No se pudo completar el registro. Revisa tus datos o inicia sesión si ya tienes una cuenta."
          );
        }

        throw new Error("No se pudo crear tu cuenta.");
      }

      router.push("/login?registered=1");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al registrar la cuenta."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-red-500";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071321] px-5 py-14 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl sm:p-9">
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Volver al inicio
        </Link>

        <h1 className="mt-7 text-3xl font-black">
          Crea tu cuenta
        </h1>

        <p className="mt-2 text-slate-400">
          Únete a PollaMix y prepárate para participar
          en las competencias de la Liga MX.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm">
              Nombre completo
            </label>
            <input
              id="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm">
              Correo electrónico
            </label>
            <input
              id="email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm">
              Celular de contacto
            </label>
            <div className="flex gap-2">
              <span className="flex items-center rounded-xl border border-slate-700 bg-slate-800 px-4 text-white">
                +57
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                required
                pattern="3[0-9]{9}"
                maxLength={10}
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
                placeholder="3001234567"
                className={inputClass}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Lo usaremos para comunicaciones sobre tu participación
              y para contactarte si resultas ganador.
            </p>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm">
              Contraseña
            </label>
            <input
              id="password"
              required
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <p className="mt-2 text-xs text-slate-400">
              Mínimo 12 caracteres.
            </p>
          </div>

          <div>
            <label htmlFor="confirm" className="mb-2 block text-sm">
              Confirmar contraseña
            </label>
            <input
              id="confirm"
              required
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 accent-red-600"
            />
            <span>
              He leído y acepto las{" "}
              <Link
                href="/reglas"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-red-400 underline"
              >
                reglas de participación
              </Link>.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 py-4 font-bold transition hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "Crear mi cuenta"}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-bold text-red-400 hover:underline"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
