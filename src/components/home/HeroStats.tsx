interface HeroStatProps {
    value: string;
    label: string;
}

export default function HeroStat({ value, label }: HeroStatProps) {
    return (
        <div
            className="
        bg-slate-900/80
        backdrop-blur
        rounded-2xl
        border
        border-slate-700
        p-5
        text-center
        hover:border-red-600
        transition-all
        duration-300
      "
        >
            <h3 className="text-4xl font-black text-red-500">
                {value}
            </h3>

            <p className="text-slate-400 mt-2">
                {label}
            </p>
        </div>
    );
}