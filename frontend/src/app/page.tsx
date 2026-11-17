import Header from "@/components/layout/Header";
import HomeGate from "@/components/home/HomeGate";
import HeroV2 from "@/components/home/HeroV2";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#071321] pt-20 text-white">
      <Header />

      <HeroV2 />

      <HomeGate />
    </main>
  );
}