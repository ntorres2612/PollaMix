
import { ApiMatch } from "@/types/match";
import type { PredictionSelection } from "@/lib/predictions";
import MatchCard from "./MatchCard";

interface Props {
  week: string;
  matches: ApiMatch[];
  tournamentId: number;
  selections: Record<number, PredictionSelection>;
  onSelectionChange: (
    matchId: number,
    selection: PredictionSelection,
  ) => void;
  canPredict: boolean;
}

export default function MatchWeek({
  week,
  matches,
  tournamentId,
  selections,
  onSelectionChange,
  canPredict,
}: Props) {
  return (
    <section className="mb-16">
      <h2 className="mb-8 text-3xl font-black">
        {week}
      </h2>

      <div className="space-y-5">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            tournamentId={tournamentId}
            selection={selections[match.id] ?? null}
            onSelectionChange={onSelectionChange}
            canPredict={canPredict}
          />
        ))}
      </div>
    </section>
  );
}
