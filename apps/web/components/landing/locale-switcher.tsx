import Link from "next/link";
import type { Locale } from "../../lib/translations";
import { SUPPORTED_LOCALES } from "../../lib/translations";

interface LocaleSwitcherProps {
  current: Locale;
}

export function LocaleSwitcher({ current }: LocaleSwitcherProps) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-xs">
      {SUPPORTED_LOCALES.map((loc) => (
        <Link
          key={loc.code}
          href={loc.href}
          className={`rounded-full px-3 py-1 font-medium transition-colors duration-150 ${
            loc.code === current
              ? "bg-emerald-500/15 text-emerald-400"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {loc.label}
        </Link>
      ))}
    </div>
  );
}
