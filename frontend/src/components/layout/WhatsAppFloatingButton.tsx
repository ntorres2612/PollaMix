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
    title: "Consulta",
    description: "Inscripciones, pronósticos y funcionamiento.",
    message:
      "Hola, equipo de GolPro. Tengo una consulta sobre " +
      "el funcionamiento de la plataforma. ¿Me pueden ayudar?",
  },
  {
    title: "Comprobante de pago",
    description: "Envía el soporte de tu inscripción.",
    message:
      "Hola, equipo de GolPro. Quiero enviar mi " +
      "comprobante de pago para que puedan verificar " +
      "mi inscripción. Adjunto el soporte a continuación.",
  },
];

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 fill-current"
    >
      <path d="M20.5 3.5A11 11 0 0 0 2.1 17.2L1 23l6-1.6A11 11 0 0 0 12 23a11 11 0 0 0 8.5-19.5ZM12 21a9 9 0 0 1-4.6-1.3l-.3-.2-3.5.9.9-3.4-.2-.3A9 9 0 1 1 12 21Zm5-6.7c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.2-.3a.5.5 0 0 0 0-.5c0-.1-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.8 11.8 0 0 0 4.5 4 15 15 0 0 0 1.5.6 3.6 3.6 0 0 0 1.7.1 2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.6-.3Z" />
    </svg>
  );
}

export default function WhatsAppFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      {open && (
        <div
          id="golpro-whatsapp-menu"
          className="w-[min(320px,calc(100vw-40px))] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1b2e] shadow-2xl shadow-black/50"
          role="region"
          aria-label="Contacto por WhatsApp"
        >
          <div className="border-b border-white/10 px-4 py-4">
            <p className="text-sm font-semibold text-white">
              Atención GolPro
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Escríbenos por WhatsApp. Respondemos en horario de atención.
            </p>
          </div>

          {!isConfigured ? (
            <p className="px-4 py-4 text-sm text-amber-200">
              El canal de WhatsApp todavía no está configurado.
            </p>
          ) : (
            <div className="p-2">
              {options.map((option) => (
                <a
                  key={option.title}
                  href={whatsappLink(option.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span>
                    <span className="block text-sm font-semibold text-white">
                      {option.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {option.description}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-slate-500">
                    →
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
            ? "Cerrar contacto por WhatsApp"
            : "Contactar por WhatsApp"
        }
        aria-expanded={open}
        aria-controls="golpro-whatsapp-menu"
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#0d1b2e] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/40 transition hover:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        <span className="text-[#25D366]">
          <WhatsAppIcon />
        </span>
        {open ? "Cerrar" : "WhatsApp"}
      </button>
    </div>
  );
}
