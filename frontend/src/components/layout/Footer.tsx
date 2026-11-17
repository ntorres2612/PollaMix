import Image from "next/image";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-800 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 text-center">
        <Image
          src="/logos/torres-tech-solutions.jpg"
          alt="Logotipo de Torres Tech Solutions"
          width={96}
          height={96}
          className="h-20 w-20 rounded-full"
        />
        <p className="text-sm font-semibold text-slate-200">
          Total Gol es una aplicación desarrollada por Torres Tech Solutions.
        </p>
        <p className="text-sm text-slate-400">
          © 2026 Torres Tech Solutions. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
