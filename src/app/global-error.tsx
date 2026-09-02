'use client'

import { useEffect, useMemo } from 'react'

import { ApplicationErrorScreen } from '@/features/errors/application-error-screen'
import { createErrorId } from '@/lib/errors/error-id'
import { reportError } from '@/lib/errors/report-error'

type GlobalErrorPageProps = {
  error: Error & {
    digest?: string
  }
  reset: () => void
}

export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  const errorId = useMemo(() => createErrorId(), [])

  useEffect(() => {
    reportError(error, {
      errorId,
      source: 'next-global-error-boundary',
      digest: error.digest,
      pathname:
        typeof window !== 'undefined'
          ? window.location.pathname
          : undefined,
    })
  }, [error, errorId])

  return (
    <html lang="id">
      <body>
        <ApplicationErrorScreen
          errorId={errorId}
          onRetry={reset}
        />
      </body>
    </html>
  )
}
