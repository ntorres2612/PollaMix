import MatchSelector from "./MatchSelector";

interface Props {
  home: string;
  away: string;
  date: string;
  time: string;
}

export default function MatchCard({
  home,
  away,
  date,
  time,
}: Props) {
  return (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-red-600 transition-all">

      <div className="flex justify-between items-center">

        <div>
          <h2 className="text-2xl font-bold">
            {home}
          </h2>

          <p className="text-slate-400">
            Local
          </p>
        </div>

        <div className="text-center">
          <h3 className="text-red-500 text-xl font-black">
            VS
          </h3>

          <p className="text-slate-400 text-sm mt-2">
            {date}
          </p>

          <p className="text-slate-500 text-xs">
            {time}
          </p>
        </div>

        <div className="text-right">
          <h2 className="text-2xl font-bold">
            {away}
          </h2>

          <p className="text-slate-400">
            Visitante
          </p>
        </div>

      </div>

      <MatchSelector />

    </div>
  );
}