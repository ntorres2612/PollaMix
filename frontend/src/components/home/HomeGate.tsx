"use client";

import { useEffect, useState } from "react";

import CurrentTournamentMatches from "@/components/match/CurrentTournamentMatches";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import GuestPitch from "./GuestPitch";

export default function HomeGate() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  if (user === undefined) {
    return null;
  }

  if (!user) {
    return (
      <GuestPitch
        title="Compite con lo que sabes de fútbol"
        lead="Crea tu cuenta para ver los partidos de la polla, armar tu pronóstico y seguir la clasificación. Sin sesión solo ves cómo se juega."
      />
    );
  }

  return <CurrentTournamentMatches />;
}
