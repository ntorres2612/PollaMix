import Image from "next/image";
import Link from "next/link";

import Navbar from "./Navbar";

export default function Header() {
  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-20 items-center justify-between">
          {/* Logo + identidad */}
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="relative h-14 w-14 shrink-0 sm:h-16 sm:w-16">
              <Image
                src="/logos/polla-mix-logo.png"
                alt="PollaMix"
                fill
                priority
                sizes="64px"
                className="object-contain"
              />
            </div>

            <div>
              <h1 className="text-xl font-black text-white sm:text-2xl">
                PollaMix
              </h1>

              <p className="text-xs text-slate-400 sm:text-sm">
                Liga MX
              </p>
            </div>
          </Link>

          <Navbar />
        </div>
      </div>
    </header>
  );
}