interface CardProps {
    children: React.ReactNode;
}

export default function Card({ children }: CardProps) {
    return (
        <div
            className="
            bg-white/5
            backdrop-blur-md
            border
            border-white/10
            rounded-3xl
            shadow-xl
            hover:scale-[1.02]
            hover:border-red-500
            transition-all
            duration-300
            "
        >
            {children}
        </div>
    );
}