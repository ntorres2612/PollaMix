'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';

const API = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
).replace(/\/$/, '');

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('token') || '';

    // Quitar el token de la barra de direcciones y del historial visible.
    window.history.replaceState(null, '', '/reset-password');
    setToken(/^[a-f0-9]{64}$/.test(value) ? value : '');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !token) return;

    if (password.length < 12 || password.length > 128) {
      setError('La contraseña debe tener entre 12 y 128 caracteres.');
      return;
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(
            'El enlace es inválido, ya fue utilizado o ha vencido.'
          );
        }
        throw new Error('No se pudo actualizar la contraseña.');
      }

      setSuccess(true);
      setToken('');
      setPassword('');
      setConfirm('');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo actualizar la contraseña.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm font-bold uppercase tracking-widest text-red-400">
          PollaMix
        </p>
        <h1 className="mt-3 text-3xl font-black">
          Nueva contraseña
        </h1>

        {token === null ? (
          <p className="mt-5 text-sm text-slate-400">Validando enlace...</p>
        ) : success ? (
          <div className="mt-6">
            <p role="status" className="text-emerald-300">
              Tu contraseña fue actualizada correctamente.
            </p>
            <Link href="/login" className="mt-5 inline-block rounded-xl bg-red-600 px-5 py-3 font-bold">
              Iniciar sesión
            </Link>
          </div>
        ) : !token ? (
          <div className="mt-6">
            <p role="alert" className="text-red-300">
              El enlace de recuperación no es válido.
            </p>
            <Link href="/forgot-password" className="mt-5 inline-block text-slate-300 underline">
              Solicitar otro enlace
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-semibold">
                Nueva contraseña
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold">
                Confirmar contraseña
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-red-600 px-5 py-3 font-bold hover:bg-red-500 disabled:opacity-50"
            >
              {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
            </button>

            {error && (
              <p role="alert" className="text-sm text-red-300">{error}</p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
