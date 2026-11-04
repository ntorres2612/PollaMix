import Link from "next/link";

const sections = [
  {
    title: "1. Registro e inscripción",
    text: "Para participar en PollaMix debes crear una cuenta y registrarte en el torneo correspondiente. El registro de una cuenta no equivale a una inscripción automática en la competencia.",
  },
  {
    title: "2. Participación sin límite de cupos",
    text: "Los torneos públicos de PollaMix podrán admitir un número ilimitado de participantes. No se exige alcanzar una cantidad mínima de inscritos para que la competencia comience.",
  },
  {
    title: "3. Apertura y cierre de inscripciones",
    text: "Cada torneo tendrá fechas y horas específicas para la apertura, el cierre de inscripciones y el inicio de la competencia. Una vez finalizado el periodo de registro no podrán incorporarse nuevos participantes.",
  },
  {
    title: "4. Pronósticos deportivos",
    text: "Cada jugador deberá registrar sus pronósticos dentro de los plazos habilitados. Una vez bloqueado un partido por el sistema, sus pronósticos no podrán modificarse.",
  },
  {
    title: "5. Resultados válidos",
    text: "Como criterio propuesto, se considerará el marcador tras los 90 minutos reglamentarios y el tiempo de reposición. No se incluirán prórrogas ni tandas de penales, salvo que las reglas específicas del torneo indiquen expresamente lo contrario.",
  },
  {
    title: "6. Puntuación y clasificación",
    text: "La clasificación será calculada con base en los resultados validados y las reglas de puntuación publicadas para cada torneo. Los criterios exactos de asignación de puntos y resolución de empates deberán estar disponibles antes de iniciar la competencia.",
  },
  {
    title: "7. Encuentros suspendidos o aplazados",
    text: "Los partidos que sufran cambios de programación, suspensión o anulación serán tratados conforme a criterios publicados previamente. PollaMix informará su efecto sobre los pronósticos y la clasificación.",
  },
  {
    title: "8. Pagos y premios",
    text: "Cuando exista un valor de inscripción, este se mostrará antes de participar. Los premios dependerán de los pagos confirmados, la distribución anunciada y la clasificación definitiva. Los montos preliminares no constituyen premios confirmados.",
  },
  {
    title: "9. Reclamaciones",
    text: "Los participantes podrán comunicar errores de registro, resultados o clasificación por los canales oficiales. Los plazos y el procedimiento de reclamación deberán publicarse antes de habilitar torneos con pagos reales.",
  },
  {
    title: "10. Finalización y juego limpio",
    text: "La competencia terminará conforme al calendario publicado, una vez validados los resultados necesarios. No se permite manipular cuentas, pagos, pronósticos o clasificaciones para obtener ventajas indebidas.",
  },
];

export default function ReglasPage() {
  return (
    <main className="min-h-screen bg-[#071321] px-5 py-14 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm text-red-400 hover:underline"
        >
          ← Volver al inicio
        </Link>

        <p className="mt-12 text-sm font-bold uppercase tracking-widest text-red-400">
          POLLAMIX · LIGA MX
        </p>

        <h1 className="mt-4 text-4xl font-black sm:text-5xl">
          Reglamento de participación
        </h1>

        <p className="mt-5 text-lg leading-8 text-slate-300">
          Conoce las condiciones generales para participar
          en las competencias de PollaMix.
        </p>

        <div className="mt-10 space-y-4">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6"
            >
              <h2 className="text-xl font-bold">
                {section.title}
              </h2>
              <p className="mt-3 leading-7 text-slate-300">
                {section.text}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
          Reglamento preliminar: antes de recibir pagos reales
          deberán aprobarse los criterios exactos de puntuación,
          desempates, reclamaciones, devoluciones y entrega
          de premios, además de las condiciones legales aplicables.
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-red-600 px-6 py-3 font-bold hover:bg-red-500"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-600 px-6 py-3 font-semibold hover:bg-slate-800"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </main>
  );
}
