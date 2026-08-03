"use client";

import { useState } from "react";

export default function MatchSelector() {
  const [selected, setSelected] = useState("");

  const options = [
    "Local",
    "Empate",
    "Visitante",
  ];

  return (
    <div className="flex gap-3 mt-5">

      {options.map((option) => (

        <button
          key={option}
          onClick={() => setSelected(option)}
          className={`px-5 py-2 rounded-xl font-semibold transition-all duration-300

          ${
            selected === option
              ? "bg-red-600 text-white"
              : "bg-slate-800 hover:bg-slate-700"
          }`}
        >
          {option}
        </button>

      ))}

    </div>
  );
}