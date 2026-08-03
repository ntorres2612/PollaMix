import Container from "@/components/ui/Container";
import MatchWeek from "./MatchWeek";
import { matches } from "@/data/matches";

export default function MatchTable() {

  const grouped = Object.groupBy(
    matches,
    (match) => match.week
  );

  return (
    <section className="py-24">

      <Container>

        <h2 className="text-5xl font-black text-center mb-16">
          Próximos Partidos
        </h2>

        {Object.entries(grouped).map(([week, list]) => (
          <MatchWeek
            key={week}
            week={Number(week)}
            matches={list ?? []}
          />
        ))}

      </Container>

    </section>
  );
}