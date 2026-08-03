import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import Badge from "@/components/ui/Badge";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#071321] py-20">

      <Container>

        <SectionTitle
          title="Polla Mix"
          subtitle="Biblioteca de Componentes"
        />

        <div className="flex justify-center mb-8">
          <Badge text="Sprint 1.3" />
        </div>

        <Card>

          <p className="mb-6">
            Este Card será reutilizado en todo el proyecto.
          </p>

          <div className="flex gap-4">

            <Button>
              Participar
            </Button>

            <Button variant="secondary">
              Ver Premios
            </Button>

          </div>

        </Card>

      </Container>

    </main>
  );
}