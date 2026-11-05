"use client";

import { useEffect, useState } from "react";

interface TeamLogoProps {
  src?: string | null;
  name: string;
  size?: string;
}

function getValidLogo(src?: string | null): string | null {
  if (!src || !src.trim()) return null;

  const value = src.trim();

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return null;
    }

    if (
      url.hostname === "example.invalid" ||
      url.hostname.endsWith(".invalid") ||
      url.hostname === "localhost"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export default function TeamLogo({
  src,
  name,
  size = "h-[55px] w-[55px]",
}: TeamLogoProps) {
  const validLogo = getValidLogo(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [validLogo]);

  if (!validLogo || failed) {
    return (
      <div
        role="img"
        aria-label={`Escudo no disponible de ${name}`}
        className={`${size} flex shrink-0 items-center justify-center rounded-full bg-white/10 text-xl`}
      >
        ⚽
      </div>
    );
  }

  return (
    <img
      src={validLogo}
      alt={`Escudo de ${name}`}
      width={55}
      height={55}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${size} shrink-0 object-contain`}
    />
  );
}
