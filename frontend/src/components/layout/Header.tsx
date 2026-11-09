import Image from "next/image";
import Link from "next/link";

import Navbar from "./Navbar";

export default function Header() {
  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-20 items-center justify-between">
          {/* Identidad GolPro: símbolo vectorial y nombre */}
          <Link
            href="/"
            aria-label="GolPro - Inicio"
            className="flex shrink-0 items-center transition-opacity hover:opacity-90"
          >
            <div className="flex h-16 shrink-0 items-center">
              <Image
                src="/logos/golpro-logo-claro-v2.png"
                alt="GolPro - Pronósticos y Resultados"
                width={1659}
                height={948}
                priority
                sizes="(max-width: 640px) 120px, (max-width: 768px) 150px, 175px"
                className="block h-[56px] w-auto object-contain sm:h-[64px]"
              />
            </div>
          </Link>

          <Navbar />
        </div>
      </div>
    </header>
  );
}