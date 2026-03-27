import Link from 'next/link';
import type { NavItem } from '../nav-config';

interface PageNavProps {
  prev: NavItem | null;
  next: NavItem | null;
  githubPath?: string;
}

export function PageNav({ prev, next, githubPath }: PageNavProps) {
  return (
    <div className="mt-16 pt-8 border-t border-white/5">
      <div className="flex items-start justify-between gap-4">
        {prev ? (
          <Link
            href={prev.href}
            className="group flex flex-col gap-1 max-w-[45%]"
          >
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </span>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-emerald-400 transition-colors">
              {prev.label}
            </span>
          </Link>
        ) : (
          <div />
        )}

        {next && (
          <Link
            href={next.href}
            className="group flex flex-col items-end gap-1 max-w-[45%] ml-auto"
          >
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              Next
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-emerald-400 transition-colors text-right">
              {next.label}
            </span>
          </Link>
        )}
      </div>

      {githubPath && (
        <div className="mt-8 flex justify-center">
          <a
            href={`https://github.com/naimkatiman/tradeclaw/edit/main/${githubPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            Edit this page on GitHub
          </a>
        </div>
      )}
    </div>
  );
}
