import { Match } from "@/types/match";
import MatchSelector from "./MatchSelector";
import Image from "next/image";

interface MatchCardProps {
    match: Match;
}

export default function MatchCard({ match }: MatchCardProps) {
    return (
        <div className="bg-white/5
                        backdrop-blur-md
                        border
                        border-white/10
                        rounded-3xl
                        p-6
                        shadow-xl
                        hover:scale-[1.02]
                        hover:border-red-500
                        hover:shadow-red-500/20
                        transition-all
                        duration-300">

            <div className="flex justify-between items-center">

                <Image
                    src={match.homeLogo}
                    alt={match.home}
                    width={55}
                    height={55}
                />

                <div>
                    <h2 className="text-2xl font-bold">
                        {match.home}
                    </h2>

                    <p className="text-slate-400">
                        Local
                    </p>
                </div>

                <div className="text-center">
                    <p className="text-red-500 text-2xl font-black">VS</p>
                    <p className="text-slate-400">{match.date}</p>
                    <p className="text-slate-500 text-sm">{match.time}</p>
                </div>

                <div className="text-right">

                    <h2 className="text-2xl font-bold">
                        {match.away}
                    </h2>

                    <p className="text-slate-400">
                        Visitante
                    </p>

                </div>

                <Image
                    src={match.awayLogo}
                    alt={match.away}
                    width={55}
                    height={55}
                />

            </div>

            <MatchSelector
                matchId={match.id}
            />

        </div>
    );
}