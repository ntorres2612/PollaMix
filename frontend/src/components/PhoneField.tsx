import {
  COUNTRY_OPTIONS,
  countryFlag,
} from "@/lib/country-codes";
import { splitPhone } from "@/lib/phone";

type PhoneFieldProps = {
  id: string;
  countryIso: string;
  national: string;
  onCountryIso: (iso: string) => void;
  onNational: (national: string) => void;
};

export default function PhoneField({
  id,
  countryIso,
  national,
  onCountryIso,
  onNational,
}: PhoneFieldProps) {
  const fieldClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-red-500";

  function changeNational(value: string) {
    const compact = value.trim().replace(/[\s().-]/g, "");
    if (compact.startsWith("+") || compact.startsWith("00")) {
      const split = splitPhone(compact, countryIso);
      if (split.national) {
        onCountryIso(split.iso);
        onNational(split.national);
        return;
      }
    }

    onNational(value.replace(/\D/g, "").slice(0, 15));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)]">
      <div>
        <label htmlFor={`${id}-country`} className="mb-2 block text-sm">
          Código del país
        </label>
        <select
          id={`${id}-country`}
          required
          value={countryIso}
          onChange={(event) => onCountryIso(event.target.value)}
          className={fieldClass}
        >
          {COUNTRY_OPTIONS.map((country) => (
            <option key={country.iso} value={country.iso}>
              {countryFlag(country.iso)} +{country.dial} {country.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={id} className="mb-2 block text-sm">
          Número
        </label>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required
          maxLength={15}
          value={national}
          onChange={(event) => changeNational(event.target.value)}
          placeholder="300 123 4567"
          className={fieldClass}
        />
      </div>
    </div>
  );
}
