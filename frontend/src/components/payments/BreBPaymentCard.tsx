"use client";

import { useState } from "react";

interface BreBPaymentCardProps {
  amount: number;
  currency: "COP" | "USD";
}

export default function BreBPaymentCard({
  amount,
  currency,
}: BreBPaymentCardProps) {
  const [copied, setCopied] = useState(false);

  const formattedAmount = new Intl.NumberFormat(
    currency === "USD" ? "en-US" : "es-CO",
    {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "USD" ? 2 : 0,
      maximumFractionDigits: currency === "USD" ? 2 : 0,
    },
  ).format(amount);

  const displayAmount =
    currency === "USD"
      ? `US${formattedAmount}`
      : formattedAmount;

  async function copyKey() {
    try {
      await navigator.clipboard.writeText("DEMO-BREB-NO-VALIDO");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-cyan-500/25 bg-slate-950/70 p-6 text-center">
      <p className="text-xs font-black uppercase tracking-widest text-cyan-400">
        Bre-B · dale!
      </p>

      <h3 className="mt-3 text-2xl font-black text-white">
        Pago mediante Bre-B
      </h3>

      <div className="mx-auto mt-5 flex h-44 w-44 flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-500/30 bg-white/5">
        <span className="text-5xl">▦</span>
        <span className="mt-3 text-xs text-slate-300">
          QR no habilitado
        </span>
      </div>

      <p className="mt-5 text-sm text-slate-400">
        Referencia ficticia de demostración
      </p>

      <p className="mt-1 text-xl font-black text-white">
        DEMO-BREB-NO-VALIDO
      </p>

      <button
        type="button"
        onClick={copyKey}
        className="mt-3 rounded-xl border border-white/20 px-5 py-2 text-sm font-bold text-white hover:bg-white/10"
      >
        {copied ? "Referencia copiada" : "Copiar referencia ficticia"}
      </button>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-slate-400">
          Valor de inscripción
        </p>

        <p className="mt-1 text-3xl font-black text-white">
          {displayAmount}
        </p>
      </div>

      {currency === "USD" && (
        <p className="mt-3 text-xs text-cyan-200">
          El valor en pesos colombianos debe calcularse
          y confirmarse antes de realizar una transferencia.
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-amber-300">
        Modo demostración. No realizar transferencias.
        Los cobros reales todavía no están habilitados.
      </p>
    </section>
  );
}
