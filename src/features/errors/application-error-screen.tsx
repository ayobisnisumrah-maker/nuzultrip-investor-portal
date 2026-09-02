'use client'

import Link from 'next/link'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

type ApplicationErrorScreenProps = {
  errorId?: string
  title?: string
  description?: string
  onRetry?: () => void
  showHomeLink?: boolean
}

export function ApplicationErrorScreen({
  errorId,
  title = 'Terjadi gangguan',
  description = 'Sistem mengalami kendala saat memproses permintaan Anda. Silakan coba kembali.',
  onRetry,
  showHomeLink = true,
}: ApplicationErrorScreenProps) {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-6 py-12">
      <section
        className="border-border bg-surface w-full max-w-lg rounded-2xl border p-6 shadow-sm sm:p-8"
        aria-labelledby="application-error-title"
      >
        <div className="bg-danger/10 text-danger flex h-12 w-12 items-center justify-center rounded-xl">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="mt-6">
          <h1
            id="application-error-title"
            className="text-fg text-xl font-semibold tracking-tight"
          >
            {title}
          </h1>

          <p className="text-fg-muted mt-3 text-sm leading-6">
            {description}
          </p>
        </div>

        {errorId ? (
          <div className="border-border bg-background mt-6 rounded-lg border px-4 py-3">
            <p className="text-fg-muted text-xs font-medium">
              Reference ID
            </p>

            <code className="text-fg mt-1 block break-all text-xs">
              {errorId}
            </code>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-opacity hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Coba Lagi
            </button>
          ) : null}

          {showHomeLink ? (
            <Link
              href="/"
              className="border-border text-fg hover:bg-muted inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Kembali ke Beranda
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  )
}
