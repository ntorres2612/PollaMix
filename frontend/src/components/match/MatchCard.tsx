import { Match } from "@/types/match";
import MatchSelector from "./MatchSelector";

interface MatchCardProps {
  match: Match;
}

export default function MatchCard({ match }: MatchCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-red-600 transition-all">

      <div className="flex justify-between items-center">

        <div>
          <h2 className="text-2xl font-bold">{match.home}</h2>
          <p className="text-slate-400">Local</p>
        </div>

        <div className="text-center">
          <p className="text-red-500 text-2xl font-black">VS</p>
          <p className="text-slate-400">{match.date}</p>
          <p className="text-slate-500 text-sm">{match.time}</p>
        </div>

        <div className="text-right">
          <h2 className="text-2xl font-bold">{match.away}</h2>
          <p className="text-slate-400">Visitante</p>
        </div>

      </div>

      <MatchSelector />

    </div>
  );
}