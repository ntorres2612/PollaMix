import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-24">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,#dc262633,transparent_35%),radial-gradient(circle_at_bottom_left,#1e40af22,transparent_35%)]" />

      <Container>

        <div className="grid lg:grid-cols-2 gap-14 items-center">

          {/* Columna izquierda */}

          <div>

            <span className="inline-block bg-red-600/20 text-red-500 px-4 py-2 rounded-full font-semibold mb-6">
              ⚽ LA MEJOR POLLA DE LA LIGA MX
            </span>

            <h1 className="text-5xl lg:text-7xl font-black leading-tight">
              Participa en
              <br />
              <span className="text-red-600">
                POLLA MIX
              </span>
            </h1>

            <p className="text-slate-400 text-xl mt-8 max-w-xl leading-8">
              Pronostica los resultados de cada jornada,
              compite con tus amigos y gana excelentes premios.
            </p>

            <div className="flex flex-wrap gap-5 mt-10">

              <Button>
                Participar
              </Button>

              <Button variant="secondary">
                Ver Premios
              </Button>

            </div>

          </div>

          {/* Columna derecha */}

          <div className="grid grid-cols-2 gap-5">

            <Card>
              <h2 className="text-5xl font-black text-red-600">
                500+
              </h2>

              <p className="text-slate-400 mt-3">
                Usuarios activos
              </p>
            </Card>

            <Card>
              <h2 className="text-5xl font-black text-red-600">
                20K+
              </h2>

              <p className="text-slate-400 mt-3">
                Pronósticos
              </p>
            </Card>

            <Card>
              <h2 className="text-5xl font-black text-red-600">
                100%
              </h2>

              <p className="text-slate-400 mt-3">
                Transparencia
              </p>
            </Card>

            <Card>
              <h2 className="text-5xl font-black text-red-600">
                $$$
              </h2>

              <p className="text-slate-400 mt-3">
                Grandes premios
              </p>
            </Card>

          </div>

        </div>

      </Container>

    </section>
  );
}