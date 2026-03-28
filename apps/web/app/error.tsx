'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-emerald-500 text-5xl font-bold mb-4">Oops</div>
        <h1 className="text-white text-xl font-semibold mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          An unexpected error occurred. Please try again or return to the home
          page.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-5 py-2.5 border border-gray-700 hover:border-gray-500 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  )
}
