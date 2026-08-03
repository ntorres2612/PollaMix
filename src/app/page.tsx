import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";

export default function Home() {
  return (
    <main className="bg-[#071321] text-white min-h-screen">
      <Navbar />
      <Hero />
    </main>
  );
}