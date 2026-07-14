/**
 * Route-level loading state: a page-shaped skeleton on design tokens
 * (DESIGN.md: loading states are skeletons, not spinners).
 */
export default function Loading() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pt-28" aria-busy="true">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="flex flex-col justify-center lg:col-span-5">
          <div className="h-3 w-44 animate-pulse rounded bg-[var(--glass-bg)]" />
          <div className="mt-6 space-y-3">
            <div className="h-10 w-4/5 animate-pulse rounded bg-[var(--glass-bg)]" />
            <div className="h-10 w-3/5 animate-pulse rounded bg-[var(--glass-bg)]" />
            <div className="h-10 w-2/3 animate-pulse rounded bg-[var(--glass-bg)]" />
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-3 w-full max-w-md animate-pulse rounded bg-[var(--glass-bg)]" />
            <div className="h-3 w-5/6 max-w-md animate-pulse rounded bg-[var(--glass-bg)]" />
            <div className="h-3 w-2/3 max-w-md animate-pulse rounded bg-[var(--glass-bg)]" />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 border-y border-[var(--border)] py-4">
            <div className="h-8 animate-pulse rounded bg-[var(--glass-bg)]" />
            <div className="h-8 animate-pulse rounded bg-[var(--glass-bg)]" />
            <div className="h-8 animate-pulse rounded bg-[var(--glass-bg)]" />
            <div className="h-8 animate-pulse rounded bg-[var(--glass-bg)]" />
          </div>
        </div>
        <div className="lg:col-span-7">
          <div className="h-[340px] w-full animate-pulse rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--glass-bg)] lg:h-[520px]" />
        </div>
      </div>
    </div>
  );
}
