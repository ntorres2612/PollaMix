"use client";

import { useState } from "react";

const rawNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
const whatsappNumber = rawNumber.replace(/\D/g, "");

const isConfigured =
  /^[1-9]\d{7,14}$/.test(whatsappNumber);

function whatsappLink(message: string) {
  return (
    `https://wa.me/${whatsappNumber}` +
    `?text=${encodeURIComponent(message)}`
  );
}

const options = [
  {
    title: "Tengo una duda",
    description: "Inscripciones, pronósticos y funcionamiento.",
    message:
      "Hola, equipo de PollaMix. Tengo una consulta sobre " +
      "el funcionamiento de la plataforma. ¿Me pueden ayudar?",
  },
  {
    title: "Enviar comprobante de pago",
    description: "Adjunta tu comprobante desde WhatsApp.",
    message:
      "Hola, equipo de PollaMix. Quiero enviar mi " +
      "comprobante de pago para que puedan verificar " +
      "mi inscripción. Adjunto el soporte a continuación.",
  },
];

export default function WhatsAppFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      {open && (
        <div
          id="pollamix-whatsapp-menu"
          className="w-[min(340px,calc(100vw-40px))] overflow-hidden rounded-2xl border border-white/15 bg-[#101c2f] shadow-2xl shadow-black/50"
          role="region"
          aria-label="Opciones de soporte por WhatsApp"
        >
          <div className="bg-[#075e39] p-4">
            <p className="font-bold text-white">
              Soporte PollaMix
            </p>
            <p className="mt-1 text-sm text-white/85">
              ¿En qué podemos ayudarte?
            </p>
          </div>

          {!isConfigured ? (
            <p className="p-4 text-sm text-amber-200">
              El canal de WhatsApp todavía no está
              configurado.
            </p>
          ) : (
            <div className="space-y-1 p-2">
              {options.map((option) => (
                <a
                  key={option.title}
                  href={whatsappLink(option.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl p-3 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
                >
                  <span className="block text-sm font-bold text-white">
                    {option.title}
                  </span>
                  <span className="mt-1 block text-xs text-slate-300">
                    {option.description}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-label={
          open
            ? "Cerrar soporte por WhatsApp"
            : "Abrir soporte por WhatsApp"
        }
        aria-expanded={open}
        aria-controls="pollamix-whatsapp-menu"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/40 transition hover:scale-105 hover:bg-[#20bd5a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        {open ? (
          <span aria-hidden="true" className="text-3xl leading-none">
            ×
          </span>
        ) : (
          <img
            src="/images/pollamix-whatsapp.png"
            alt=""
            width={52}
            height={52}
            className="h-[52px] w-[52px] object-contain"
          />
        )}
      </button>
    </div>
  );
}
