import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import MatchTable from "@/components/match/MatchTable";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";



export default function Home() {
  return (
    <main className="bg-[#071321] text-white min-h-screen">
      <Header />
      <Hero />
      <MatchTable />
      <Footer />
    </main>
  );
}