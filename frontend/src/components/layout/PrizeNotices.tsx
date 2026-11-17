"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  markNotificationRead,
  type AppNotification,
} from "@/lib/notifications";

function when(value: string) {
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  });
}

function ping() {
  try {
    const audio = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audio) return;
    const context = new audio();
    const tone = context.createOscillator();
    const level = context.createGain();
    tone.frequency.value = 880;
    level.gain.value = 0.04;
    tone.connect(level);
    level.connect(context.destination);
    tone.start();
    tone.stop(context.currentTime + 0.18);
    tone.onended = () => void context.close();
  } catch {
    // El navegador puede bloquear el sonido hasta que haya un clic.
  }
}

function announce(notices: AppNotification[]) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  for (const notice of notices) {
    const popup = new Notification(notice.title, { body: notice.body });
    popup.onclick = () => window.focus();
  }
}

export default function PrizeNotices() {
  const router = useRouter();
  const panel = useRef<HTMLDetailsElement>(null);
  const seen = useRef<Set<number> | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  useEffect(() => {
    function closeOnOutside(event: PointerEvent) {
      const root = panel.current;
      if (!root?.open) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      root.open = false;
    }

    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, []);

  useEffect(() => {
    let active = true;

    function load() {
      getNotifications()
        .then((result) => {
          if (!active) return;
          const arrived = seen.current
            ? result.items.filter((item) => !item.readAt && !seen.current?.has(item.id))
            : [];
          seen.current = new Set(result.items.map((item) => item.id));
          if (arrived.length > 0) {
            setToasts((current) => [...arrived, ...current].slice(0, 3));
            ping();
            announce(arrived);
            window.setTimeout(() => {
              const ids = new Set(arrived.map((item) => item.id));
              setToasts((current) => current.filter((item) => !ids.has(item.id)));
            }, 8000);
          }
          setItems(result.items);
          setUnreadCount(result.unreadCount);
        })
        .catch(() => {
          if (!active) return;
          setItems([]);
          setUnreadCount(0);
        });
    }

    load();
    const timer = window.setInterval(load, 5000);
    function askOnce() {
      document.removeEventListener("pointerdown", askOnce);
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    }
    document.addEventListener("pointerdown", askOnce);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("pointerdown", askOnce);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  if (items.length === 0 && toasts.length === 0) return null;

  function permitNotifications() {
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    void Notification.requestPermission();
  }

  async function openNotice(notice: AppNotification) {
    if (!notice.readAt) {
      try {
        await markNotificationRead(notice.id);
        setItems((current) =>
          current.map((item) =>
            item.id === notice.id
              ? { ...item, readAt: new Date().toISOString() }
              : item,
          ),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        // El aviso sigue visible si no se pudo marcar como leído.
      }
    }
    setToasts((current) => current.filter((item) => item.id !== notice.id));
    const destination = notice.kind === "SLIP_PAID"
      ? "/pronosticos"
      : notice.kind.startsWith("PAYMENT_")
        ? "/admin/pagos"
        : "/premios";
    router.push(destination);
  }

  return (
    <>
      {toasts.length > 0 && createPortal(
        <div className="fixed right-4 top-20 z-[80] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3">
          {toasts.map((notice) => (
            <button
              key={notice.id}
              type="button"
              onClick={() => void openNotice(notice)}
              className="rounded-2xl border border-red-500/40 bg-slate-950 p-4 text-left shadow-2xl"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-red-400">
                Nuevo aviso
              </p>
              <p className="mt-1 text-sm font-bold text-white">{notice.title}</p>
              <p className="mt-1 text-sm leading-5 text-slate-300">{notice.body}</p>
            </button>
          ))}
        </div>,
        document.body,
      )}
      {items.length > 0 && (
    <details ref={panel} className="relative" onToggle={permitNotifications}>
      <summary
        className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-bold text-white hover:border-red-500 [&::-webkit-details-marker]:hidden"
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : "Notificaciones"
        }
      >
        Avisos
        {unreadCount > 0 && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </summary>
      <div className="absolute right-0 top-full z-[70] mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
        <p className="px-2 text-xs font-bold uppercase tracking-widest text-red-400">
          Avisos
        </p>
        <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto">
          {items.map((notice) => (
            <li key={notice.id}>
              <button
                type="button"
                onClick={() => void openNotice(notice)}
                className="w-full rounded-xl px-3 py-3 text-left hover:bg-white/5"
              >
                <p className="text-sm font-bold text-white">
                  {notice.readAt ? notice.title : `Nuevo · ${notice.title}`}
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-300">
                  {notice.body}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {when(notice.createdAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </details>
      )}
    </>
  );
}
