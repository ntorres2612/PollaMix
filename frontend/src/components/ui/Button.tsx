interface ButtonProps {
    children: React.ReactNode;
    variant?: "primary" | "secondary";
    onClick?: () => void;
    type?: "button" | "submit";
}

export default function Button({
    children,
    variant = "primary",
    onClick,
    type = "button",
}: ButtonProps) {
    const styles = {
        primary:
            "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-2xl",

        secondary:
            "bg-slate-700 hover:bg-slate-600 text-white",
    };

    return (
        <button
            type={type}
            onClick={onClick}
            className={`
        px-6
        py-3
        rounded-xl
        font-bold
        uppercase
        tracking-wide
        transition-all
        duration-300
        hover:scale-105
        ${styles[variant]}
      `}
        >
            {children}
        </button>
    );
}