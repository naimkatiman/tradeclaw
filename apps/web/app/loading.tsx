export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-emerald-500 mb-4" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  )
}
