"use client";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import Image from "next/image";
import { motion } from "framer-motion";
import HeroStat from "./HeroStats";

export default function Hero() {
    return (
        <section className="relative overflow-hidden pt-36 pb-24" style={{
            backgroundImage: "url('/images/stadium.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
        }}>

            {/* Fondo decorativo */}
            <div className="absolute inset-0 bg-[#071321]/80 -z-10" />

            <Container>

                <div className="grid lg:grid-cols-2 gap-14 items-center">

                    {/* Columna izquierda */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                    <div>

                        <span className="inline-block bg-red-600/20 text-red-500 px-4 py-2 rounded-full font-semibold mb-6">
                            ⚽ LA MEJOR POLLA DE LA LIGA MX
                        </span>

                        <h1 className="text-5xl lg:text-7xl font-black leading-tight">
                            Participa en
                            <br />
                            <span className="text-red-600">
                                POLLA MIX
                            </span>
                        </h1>

                        <p className="text-slate-400 text-xl mt-8 max-w-xl leading-8">
                            Pronostica los resultados de cada jornada,
                            compite con tus amigos y gana excelentes premios.
                        </p>

                        <div className="flex flex-wrap gap-5 mt-10">

                            <Button>
                                Participar
                            </Button>

                            <Button variant="secondary">
                                Ver Premios
                            </Button>

                        </div>

                    </div>
                </motion.div>
                {/* Columna derecha */}

                <motion.div
                    initial={{ opacity: 0, x: 80 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative flex justify-center"
                >
                    <Image
                        src="/images/player.png"
                        alt="Jugador"
                        width={500}
                        height={650}
                        priority
                        className="drop-shadow-[0_0_40px_rgba(220,38,38,.35)]"
                    />

                    <div className="absolute -bottom-10 grid grid-cols-2 gap-4 w-full max-w-md">
                        <HeroStat value="500+" label="Usuarios" />
                        <HeroStat value="20K+" label="Pronósticos" />
                        <HeroStat value="100%" label="Seguro" />
                        <HeroStat value="$50M" label="Premios" />
                    </div>
                </motion.div>

            </div>

        </Container>

        </section >
    );
}