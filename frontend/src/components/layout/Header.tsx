import Image from "next/image";
import Navbar from "./Navbar";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">

      <div className="max-w-7xl mx-auto px-6">

        <div className="flex justify-between items-center h-20">

          <div className="flex items-center gap-4">

            <Image
              src="/logos/polla-mix-logo.png"
              alt="PollaMix"
              width={155}
              height={155}
            />

            <div>

              <h1 className="text-2xl font-black">
                PollaMix
              </h1>

              <p className="text-slate-400 text-sm">
                Liga MX
              </p>

            </div>

          </div>

          <Navbar />

        </div>

      </div>

    </header>
  );
}