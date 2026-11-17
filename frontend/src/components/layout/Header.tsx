import Image from "next/image";
import Link from "next/link";

import Navbar from "./Navbar";

export default function Header() {
  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-20 items-center justify-between">
          {/* Identidad Total Gol: símbolo vectorial y nombre */}
          <Link
            href="/"
            aria-label="Total Gol - Inicio"
            className="flex shrink-0 items-center transition-opacity hover:opacity-90"
          >
            <Image
              src="/logos/totalgol-mark.jpg"
              alt="Total Gol - La emoción del gol absoluto"
              width={880}
              height={520}
              priority
              sizes="160px"
              className="block h-[68px] w-auto rounded-lg object-contain sm:h-[72px]"
            />
          </Link>

          <Navbar />
        </div>
      </div>
    </header>
  );
}