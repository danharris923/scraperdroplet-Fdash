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
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong!</h2>
        <div className="bg-slate-900 rounded-lg p-4 mb-4 text-left overflow-auto">
          <p className="text-red-400 font-mono text-sm break-all">{error.message}</p>
          {error.stack && (
            <pre className="text-slate-400 font-mono text-xs mt-2 whitespace-pre-wrap break-all">
              {error.stack}
            </pre>
          )}
        </div>
        <button
          onClick={reset}
          className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
