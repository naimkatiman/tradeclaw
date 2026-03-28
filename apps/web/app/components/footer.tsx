import Link from 'next/link';
import { Footprints, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0d1117] px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-lg font-bold">
            <Footprints className="h-5 w-5 text-emerald-400" /> Trade
            <span className="text-emerald-400">Claw</span>
          </Link>
          <p className="mt-1 text-sm text-zinc-500">
            Open-source AI trading signals. Free forever.
          </p>
        </div>

        <div className="flex gap-6 text-sm text-zinc-400">
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
            GitHub
          </a>
          <a href="#" className="hover:text-white">
            Docs
          </a>
          <a href="#" className="hover:text-white">
            Discord
          </a>
          <a href="#" className="hover:text-white">
            Twitter
          </a>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-5xl border-t border-white/5 pt-6 text-center text-xs text-zinc-600">
        <p>
          Released under the MIT License. Built with <Heart className="inline h-3 w-3 text-rose-400 align-text-bottom" /> by{" "}
          <a
            href="https://github.com/naimkatiman"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white"
          >
            @naimkatiman
          </a>
        </p>
      </div>
    </footer>
  );
}
