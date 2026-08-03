import Navbar from "@/components/layout/Navbar";
import Image from "next/image";
export default function Home() {
  return (
    <main className="min-h-screen bg-[#071321]">

      <Navbar />

      <section className="pt-40 text-center">

        <h1 className="text-6xl font-black">
          Bienvenido a
        </h1>

        <h2 className="text-7xl font-black text-red-600 mt-3">
          <Image
            src="/ChatGPT Image 29 jul 2026, 07_27_04 p.m..png"
            alt="Polla Mix"
            width={180}
            height={60}
          />
        </h2>

        <p className="mt-8 text-slate-400 text-xl">
          La mejor plataforma para pronósticos deportivos.
        </p>

      </section>

    </main>
  );
}