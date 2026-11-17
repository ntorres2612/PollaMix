import Link from "next/link";

const highlights = [
  {
    title: "Diez partidos",
    text: "Cada polla reúne diez partidos. Tú eliges local, empate o visitante.",
  },
  {
    title: "Tres premios",
    text: "El fondo de la polla se reparte entre el primer, el segundo y el tercer lugar.",
  },
  {
    title: "Pago con dale",
    text: "Escaneas el QR, pagas tu inscripción y envías el soporte para quedar activo.",
  },
];

export default function GuestPitch({
  title = "Entra para ver la polla",
  lead = "Los partidos, la clasificación y los premios se muestran cuando inicias sesión.",
}: {
  title?: string;
  lead?: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-400">
        Total Gol
      </p>
      <h2 className="mt-3 max-w-2xl text-3xl font-black text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
        {lead}
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-white/10 bg-slate-900/80 p-6"
          >
            <h3 className="text-xl font-black text-white">{item.title}</h3>
            <p className="mt-3 leading-7 text-slate-400">{item.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/register"
          className="inline-flex min-h-14 items-center justify-center rounded-xl bg-red-600 px-8 font-bold text-white transition hover:bg-red-500"
        >
          Crear cuenta
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/20 px-8 font-bold text-white transition hover:border-red-500"
        >
          Iniciar sesión
        </Link>
      </div>
    </section>
  );
}
