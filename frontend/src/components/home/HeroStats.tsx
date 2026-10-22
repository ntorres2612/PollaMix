interface HeroStatProps {
  value: string;
  label: string;
}

export default function HeroStat({
  value,
  label,
}: HeroStatProps) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 text-white shadow-lg backdrop-blur">
      <div className="text-2xl font-black">
        {value}
      </div>

      <div className="mt-1 text-sm text-slate-400">
        {label}
      </div>
    </div>
  );
}