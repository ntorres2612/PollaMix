interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export default function SectionTitle({
  title,
  subtitle,
}: SectionTitleProps) {
  return (
    <div className="text-center mb-12">
      <h2 className="text-4xl font-black">
        {title}
      </h2>

      {subtitle && (
        <p className="text-slate-400 mt-3">
          {subtitle}
        </p>
      )}
    </div>
  );
}