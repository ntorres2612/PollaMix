import Link from "next/link";
import HomeTournamentStats from "./HomeTournamentStats";

const steps = [
  {
    number: "01",
    title: "Únete a la competencia",
    description:
      "Ingresa a tu cuenta, consulta el torneo y revisa las condiciones de participación.",
  },
  {
    number: "02",
    title: "Haz tus pronósticos",
    description:
      "Elige los marcadores de cada partido antes del cierre de los pronósticos.",
  },
  {
    number: "03",
    title: "Suma puntos y compite",
    description:
      "Consulta los resultados, sigue tu posición y conoce los premios del torneo.",
  },
];

export default function HeroV2() {
  return (
    <>
      <section className="relative isolate flex min-h-[690px] items-center overflow-hidden bg-[#030b19] lg:min-h-[760px]">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/stadium.png')",
          }}
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(90deg, rgba(3,9,23,.96) 0%, rgba(3,9,23,.86) 43%, rgba(3,9,23,.47) 100%), linear-gradient(0deg, #071321 0%, transparent 32%)",
          }}
        />

        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="max-w-[760px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[.16em] text-red-300 backdrop-blur-sm sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              La emoción de la Liga MX
            </span>

            <h1 className="mt-8 text-5xl font-black leading-[1.06] tracking-tight text-white sm:text-6xl lg:text-[76px]">
              Cada jornada
              <span className="block text-red-500">
                cuenta.
              </span>
            </h1>

            <p className="mt-7 max-w-[620px] text-lg leading-relaxed text-slate-200 sm:text-xl">
              Pronostica los resultados, reta a otros aficionados
              y demuestra cuánto sabes de fútbol.
              Cada marcador puede cambiar la clasificación.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-14 items-center justify-center rounded-xl bg-red-600 px-8 text-base font-bold text-white shadow-xl shadow-red-950/30 transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400"
              >
                Ingresar y participar
                <span className="ml-3" aria-hidden="true">→</span>
              </Link>

              <Link
                href="/premios"
                className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Conocer los premios
              </Link>
            </div>

            <HomeTournamentStats />

            <div className="mt-14 grid max-w-[670px] gap-4 border-t border-white/15 pt-7 sm:grid-cols-3">
              <div>
                <p className="text-sm font-bold text-white">
                  Pronósticos
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Marcadores de cada jornada
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Clasificación
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Sigue tu posición
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Premios
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Consulta cada torneo
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-[#071321] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[.2em] text-red-400">
              Fácil de participar
            </p>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Tu pasión por el fútbol,
              una competencia de verdad.
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-400">
              Tres pasos para empezar a disfrutar PollaMix.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="group rounded-2xl border border-slate-800 bg-[#101c2f] p-7 transition duration-300 hover:-translate-y-1 hover:border-red-500/40 hover:bg-[#14223a]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-xl font-black text-red-400">
                  {step.number}
                </div>

                <h3 className="mt-7 text-xl font-bold text-white">
                  {step.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-400">
                  {step.description}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-4">
            <Link
              href="/jornadas"
              className="font-semibold text-red-400 transition hover:text-red-300"
            >
              Ver jornadas <span aria-hidden="true">→</span>
            </Link>

            <Link
              href="/clasificacion"
              className="font-semibold text-slate-300 transition hover:text-white"
            >
              Ver clasificación <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
