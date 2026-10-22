import CurrentTournamentMatches from "@/components/match/CurrentTournamentMatches";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#071321] text-white">
      <Header />

      <Hero />

      <CurrentTournamentMatches />

      <Footer />
    </main>
  );
}