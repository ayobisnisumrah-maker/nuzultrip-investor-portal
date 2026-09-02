'use client'

import { useEffect, useMemo } from 'react'

import { ApplicationErrorScreen } from '@/features/errors/application-error-screen'
import { createErrorId } from '@/lib/errors/error-id'
import { reportError } from '@/lib/errors/report-error'

type ErrorPageProps = {
  error: Error & {
    digest?: string
  }
  reset: () => void
}

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  const errorId = useMemo(() => createErrorId(), [])

  useEffect(() => {
    reportError(error, {
      errorId,
      source: 'next-route-error-boundary',
      digest: error.digest,
      pathname: window.location.pathname,
    })
  }, [error, errorId])

  return (
    <ApplicationErrorScreen
      errorId={errorId}
      onRetry={reset}
    />
  )
}
