interface CardProps {
  children: React.ReactNode;
}

export default function Card({ children }: CardProps) {
  return (
    <div
      className="
      bg-slate-900
      rounded-2xl
      border
      border-slate-800
      p-6
      shadow-xl
      hover:border-red-600
      transition
      duration-300
    "
    >
      {children}
    </div>
  );
}