interface BadgeProps {
  text: string;
}

export default function Badge({ text }: BadgeProps) {
  return (
    <span
      className="
      bg-red-600
      px-3
      py-1
      rounded-full
      text-sm
      font-semibold
      uppercase
    "
    >
      {text}
    </span>
  );
}