"use client";

import { usePredictionContext } from "@/context/PredictionContext";

export default function PredictionProgress() {

    const {predictions}=usePredictionContext();

    const total=Object.keys(predictions).length;

    return(

<div className="bg-red-600 rounded-xl p-6 text-center my-16">

<h2 className="text-3xl font-black">

Pronósticos realizados

</h2>

<p className="text-5xl mt-5">

{total} / 14

</p>

</div>

    )

}