import Container from "@/components/ui/Container";
import MatchWeek from "./MatchWeek";
import { matches } from "@/data/matches";


export default function MatchTable() {
  const grouped = matches.reduce((acc: any, match) => {
    if (!acc[match.week]) acc[match.week] = [];
    acc[match.week].push(match);
    return acc;
  }, {});

  return (
    <Container>

      {Object.entries(grouped).map(([week, data]) => (
        <MatchWeek
          key={week}
          week={Number(week)}
          matches={data as any}
        />
      ))}

    </Container>
  );
}