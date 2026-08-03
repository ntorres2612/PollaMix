import { Match } from "@/types/match";
import MatchCard from "./MatchCard";

interface Props {
  week: number;
  matches: Match[];
}

export default function MatchWeek({ week, matches }: Props) {
  return (
    <section className="mb-16">

      <h2 className="text-3xl font-black mb-8">
        Jornada {week}
      </h2>

      <div className="space-y-5">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
          />
        ))}
      </div>

    </section>
  );
}