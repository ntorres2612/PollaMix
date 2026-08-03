import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import MatchTable from "@/components/match/MatchTable";

export default function Home() {
  return (
    <main className="bg-[#071321] text-white min-h-screen">
      <Navbar />
      <Hero />
      <MatchTable />
    </main>
  );
}