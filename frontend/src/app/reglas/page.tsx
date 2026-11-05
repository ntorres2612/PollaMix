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
    text: "Para calcular los pronósticos se utilizará el marcador oficial correspondiente a los 90 minutos reglamentarios, incluido el tiempo de reposición. No se tendrán en cuenta los goles marcados durante prórrogas ni los resultados de tandas de penales.",
  },
  {
    title: "6. Puntuación y clasificación",
    text: "Por cada partido, el jugador obtiene 1 punto cuando acierta victoria del equipo local, empate o victoria del equipo visitante. Un pronóstico incorrecto otorga 0 puntos. Acertar el marcador exacto no concede puntos adicionales. La clasificación se establece sumando los puntos de los partidos seleccionados.",
  },
  {
    title: "7. Encuentros suspendidos o aplazados",
    text: "Si uno de los partidos seleccionados es aplazado, suspendido o interrumpido, PollaMix esperará su resultado oficial correspondiente a los 90 minutos reglamentarios y el tiempo de reposición. Mientras falte un resultado oficial válido o su puntuación, no podrá realizarse el cierre definitivo de premios. Los cambios de programación serán comunicados por los canales oficiales.",
  },
  {
    title: "8. Pagos y premios",
    text: "La bolsa de premios corresponde al 67,81 % de la recaudación de inscripciones aprobadas en COP. El 32,19 % restante corresponde a PollaMix. De la bolsa de premios, se asigna el 70 % al primer puesto, el 20 % al segundo y el 10 % al tercero. Los participantes con la misma puntuación comparten posición y dividen el importe asignado a ella. El siguiente puntaje distinto ocupa la siguiente posición, aunque haya varios jugadores empatados en la anterior. Los importes definitivos solo se establecen tras el cierre oficial.",
  },
  {
    title: "9. Reclamaciones",
    text: "Los participantes dispondrán de 48 horas, contadas desde la publicación y registro en PollaMix del último resultado oficial válido de los partidos seleccionados, para reclamar errores de resultados, puntuación o clasificación. Durante este plazo, la clasificación y los premios serán provisionales. Una vez terminado el plazo y resueltas las reclamaciones pendientes, podrá realizarse el cierre definitivo. El canal formal y el procedimiento de respuesta se informarán antes de recibir pagos reales.",
  },
  {
    title: "10. Finalización y juego limpio",
    text: "La Polla se cerrará definitivamente cuando estén registrados y puntuados todos los partidos seleccionados, haya finalizado el plazo de reclamación de 48 horas, estén resueltas las reclamaciones pendientes y se hayan conciliado los pagos. No se permite manipular cuentas, pronósticos, resultados o pagos para obtener ventajas indebidas.",
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
