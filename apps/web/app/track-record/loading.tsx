export default function TrackRecordLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        <div className="w-4 h-4 border border-[var(--border)] border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-sm font-mono">Loading track record…</span>
      </div>
    </div>
  );
}
