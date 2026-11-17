"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";
import {
  assignIncomingTransfer,
  connectMailbox,
  disconnectMailbox,
  getIncomingTransfers,
  getMailboxStatus,
  saveGoogleCredentials,
  syncMailbox,
  type IncomingTransfer,
  type MailboxStatus,
} from "@/lib/mailbox";

const STATUS_LABEL: Record<string, string> = {
  ASIGNADO: "Pagado y polla habilitada",
  REVISAR: "Hay que revisarlo",
  DUPLICADO: "Comprobante ya usado",
};

function pesos(amount: number) {
  return amount.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function when(value: string) {
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  });
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [mailbox, setMailbox] = useState<MailboxStatus | null>(null);
  const [items, setItems] = useState<IncomingTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [codes, setCodes] = useState<Record<number, string>>({});

  useEffect(() => {
    const user = getCurrentUser();
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    if (!user || user.role !== "ADMIN") {
      router.replace("/");
      return;
    }

    const correo = new URLSearchParams(window.location.search).get("correo");
    if (correo === "conectado") {
      setBanner("El Gmail quedó conectado. Total Gol ya puede leer los avisos de abonos.");
    } else if (correo === "denegado") {
      setBanner("Google no autorizó la lectura del correo.");
    } else if (correo === "permiso") {
      setBanner("Esa cuenta no quedó autorizada. Entra como administrador y acepta el acceso sin conexión.");
    } else if (correo) {
      setBanner("No se pudo guardar la conexión del Gmail. Revisa la dirección de retorno en Google Cloud y vuelve a conectar.");
    }

    let active = true;
    Promise.all([getMailboxStatus(), getIncomingTransfers()])
      .then(([status, transfers]) => {
        if (!active) return;
        setMailbox(status);
        setItems(transfers);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "No se pudieron cargar los abonos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function saveKeys() {
    setBusy(true);
    setError("");
    try {
      await saveGoogleCredentials(clientId, clientSecret);
      setClientId("");
      setClientSecret("");
      setBanner("Las claves quedaron guardadas. Ya puedes conectar el Gmail.");
      const status = await getMailboxStatus();
      setMailbox(status);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron guardar las claves.");
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const { url } = await connectMailbox();
      window.location.assign(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar la conexión.");
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      await syncMailbox();
      const [status, transfers] = await Promise.all([
        getMailboxStatus(),
        getIncomingTransfers(),
      ]);
      setMailbox(status);
      setItems(transfers);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo leer el correo.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError("");
    try {
      await disconnectMailbox();
      setMailbox((current) =>
        current
          ? { ...current, connected: false, lastSyncAt: null, lastError: null }
          : current,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo desconectar el correo.");
    } finally {
      setBusy(false);
    }
  }

  async function assign(id: number) {
    const paymentId = Number(codes[id]);
    setBusy(true);
    setError("");
    try {
      await assignIncomingTransfer(id, paymentId);
      const transfers = await getIncomingTransfers();
      setItems(transfers);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo asignar el abono.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Header />
      <Container>
        <div className="mx-auto max-w-4xl py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
            Administración
          </p>
          <h1 className="mt-2 text-4xl font-black">Abonos</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Total Gol valida el abono por el remitente y por el valor. En este ambiente el
            valor es {(mailbox?.acceptedAmount ?? 16000).toLocaleString('es-CO')} pesos. Si
            coinciden, le avisa al administrador, habilita la polla y le escribe al jugador.
          </p>

          {banner && (
            <p className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
              {banner}
            </p>
          )}
          {error && (
            <p className="mt-6 rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          {loading ? (
            <p className="mt-10 text-slate-400">Cargando abonos...</p>
          ) : mailbox ? (
            <>
              <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
                <h2 className="text-xl font-black">Correo de los abonos</h2>
                {!mailbox.configured ? (
                  <form
                    className="mt-4 space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveKeys();
                    }}
                  >
                    <p className="text-sm leading-6 text-slate-300">
                      Aquí no va el correo ni la contraseña de Gmail. El ID parece 123456789-abc.apps.googleusercontent.com y el secreto empieza por GOCSPX. La cuenta se elige después, al pulsar Conectar Gmail.
                    </p>
                    <label className="block text-sm font-bold" htmlFor="google-client-id">
                      ID de cliente
                    </label>
                    <input
                      id="google-client-id"
                      value={clientId}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="123456789-abc.apps.googleusercontent.com"
                      onChange={(event) => setClientId(event.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600"
                    />
                    <label className="block text-sm font-bold" htmlFor="google-client-secret">
                      Secreto de cliente
                    </label>
                    <input
                      id="google-client-secret"
                      type="password"
                      value={clientSecret}
                      autoComplete="off"
                      placeholder="GOCSPX-..."
                      onChange={(event) => setClientSecret(event.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600"
                    />
                    <button
                      type="submit"
                      disabled={busy || !clientId.trim() || !clientSecret.trim()}
                      className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Guardar claves
                    </button>
                    <p className="text-xs leading-5 text-slate-500">
                      En Google Cloud el cliente es una aplicación web. La dirección de retorno de este ambiente es {mailbox.redirectUri}.
                    </p>
                  </form>
                ) : mailbox.connected ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-slate-300">
                      El correo está conectado. La dirección no se muestra en esta pantalla.
                    </p>
                    <p className="text-sm text-slate-400">
                      {mailbox.lastSyncAt
                        ? `Última lectura: ${when(mailbox.lastSyncAt)}`
                        : "Todavía no se ha leído el correo."}
                    </p>
                    {mailbox.lastError && (
                      <p className="text-sm text-amber-200">{mailbox.lastError}</p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void refresh()}
                        className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
                      >
                        Buscar abonos ahora
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void disconnect()}
                        className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
                      >
                        Dejar de leer el correo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-sm leading-6 text-slate-300">
                      Autoriza solo la lectura del Gmail donde llegan los avisos del banco.
                      Total Gol no mueve dinero y no entra a la app del banco.
                    </p>
                    {mailbox.redirectUri && (
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        En Google Cloud, la dirección de retorno de este ambiente debe ser {mailbox.redirectUri}.
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void connect()}
                      className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Conectar Gmail
                    </button>
                  </div>
                )}
              </section>

              <section className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-6">
                <h2 className="text-xl font-black">Dinero que entró</h2>
                {items.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">
                    Todavía no hay un abono de {(mailbox?.acceptedAmount ?? 16000).toLocaleString('es-CO')} pesos con un remitente que coincida. Los demás pagos no se muestran.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-2xl font-black">{pesos(item.amountCOP)}</p>
                            <p className="mt-1 text-sm text-slate-300">
                              {item.payerName ?? "Persona sin nombre en el aviso"}
                              {item.concept ? ` · ${item.concept}` : ""}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {when(item.receivedAt)} · {item.fromDomain}
                            </p>
                          </div>
                          <p className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                            {STATUS_LABEL[item.status] ?? item.status}
                            {item.paymentId ? ` · GP${item.paymentId}` : ""}
                          </p>
                        </div>
                        {item.status === "REVISAR" && (
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <label className="text-sm text-slate-300" htmlFor={`gp-${item.id}`}>
                              Número GP
                            </label>
                            <input
                              id={`gp-${item.id}`}
                              inputMode="numeric"
                              value={codes[item.id] ?? ""}
                              onChange={(event) =>
                                setCodes((current) => ({
                                  ...current,
                                  [item.id]: event.target.value.replace(/\D/g, "").slice(0, 8),
                                }))
                              }
                              className="w-28 rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white"
                            />
                            <button
                              type="button"
                              disabled={busy || !codes[item.id]}
                              onClick={() => void assign(item.id)}
                              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              Asignar y aprobar
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
