'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

const API = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
).replace(/\/$/, '');

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('No se pudo procesar la solicitud.');
      }

      setMessage(
        'Si el correo está registrado, recibirás instrucciones ' +
        'para recuperar tu contraseña.'
      );
      setEmail('');
    } catch {
      setError(
        'No fue posible enviar la solicitud. Intenta nuevamente más tarde.'
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
          Recuperar contraseña
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          Escribe tu correo registrado para recibir un enlace de recuperación.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 outline-none focus:border-red-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 px-5 py-3 font-bold hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Enviar enlace'}
          </button>
        </form>

        {message && (
          <p role="status" className="mt-5 text-sm text-emerald-300">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-5 text-sm text-red-300">
            {error}
          </p>
        )}

        <Link href="/login" className="mt-7 inline-block text-sm text-slate-300 hover:text-white">
          Volver al inicio de sesión
        </Link>
      </section>
    </main>
  );
}
