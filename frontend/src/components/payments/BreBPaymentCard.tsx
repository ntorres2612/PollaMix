"use client";

import Image from "next/image";
import { useState } from "react";

interface BreBPaymentCardProps {
  amount: number;
  currency: "COP" | "USD";
  conceptCodes?: string[];
}

export default function BreBPaymentCard({
  amount,
  currency,
  conceptCodes = [],
}: BreBPaymentCardProps) {
  const [copied, setCopied] = useState<string | null>(null);

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

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      return;
    } catch {
      // El navegador puede negar el portapapeles. El respaldo deja el texto copiado igual.
    }

    try {
      const input = document.createElement("textarea");
      input.value = value;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand("copy");
      input.remove();
      setCopied(ok ? value : null);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-red-500/30 bg-[#0b1220] p-6 text-center">
      <Image
        src="/logos/totalgol-card.jpg"
        alt="Total Gol"
        width={928}
        height={656}
        className="mx-auto h-28 w-auto rounded-2xl"
      />

      <p className="mt-4 text-xs font-black uppercase tracking-widest text-red-400">
        Bre-B
      </p>

      <h3 className="mt-2 text-2xl font-black text-white">
        Escanea y paga
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-300">
        Abre la app Bre-B de tu banco, escanea este QR y paga el valor de la inscripción.
      </p>

      <div className="mx-auto mt-5 w-full max-w-xs rounded-3xl bg-white p-4 shadow-lg shadow-red-950/40">
        <Image
          src={process.env.NEXT_PUBLIC_QR_SRC || "/payments/golpro-nequi-qr.png"}
          alt="Código QR de Nequi Bre-B para pagar la inscripción de Total Gol"
          width={840}
          height={870}
          unoptimized
          className="h-auto w-full"
        />
      </div>

      {conceptCodes.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-950/30 p-4 text-left">
          <p className="text-sm font-bold text-amber-200">
            En el mensaje de la transferencia escribe este código
          </p>
          <ul className="mt-3 space-y-2">
            {conceptCodes.map((code) => (
              <li key={code} className="flex items-center justify-between gap-3">
                <span className="text-xl font-black tracking-wide text-white">
                  {code}
                </span>
                <button
                  type="button"
                  onClick={() => void copyText(code)}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10"
                >
                  {copied === code ? "Copiado" : "Copiar"}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-amber-100/80">
            Total Gol reconoce el pago por el remitente y por el valor de la inscripción, y avisa cuando la polla queda habilitada.
          </p>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-slate-400">
          Valor de inscripción
        </p>

        <p className="mt-1 text-3xl font-black text-white">
          {displayAmount}
        </p>
      </div>

      {currency === "USD" && (
        <p className="mt-3 text-xs text-red-200">
          El valor en pesos colombianos debe calcularse
          y confirmarse antes de realizar una transferencia.
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        El QR no trae el valor incluido. Escribe {displayAmount} en la app antes de confirmar.
        {" El pago se reconoce por quien lo envía y por este valor."}
      </p>
    </section>
  );
}
