import MatchCard from "./MatchCard";

interface Match {
  id: number;
  home: string;
  away: string;
  date: string;
  time: string;
}

interface Props {
  week: number;
  matches: Match[];
}

export default function MatchWeek({ week, matches }: Props) {
  return (
    <section className="mt-12">

      <h2 className="text-3xl font-black mb-8">
        Jornada {week}
      </h2>

      <div className="space-y-5">

        {matches.map((match) => (
          <MatchCard
            key={match.id}
            home={match.home}
            away={match.away}
            date={match.date}
            time={match.time}
          />
        ))}

      </div>

    </section>
  );
}