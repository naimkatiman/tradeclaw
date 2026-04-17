export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-emerald-500 mb-4" />
        <p className="text-[var(--text-secondary)] text-sm">Loading...</p>
      </div>
    </div>
  )
}
