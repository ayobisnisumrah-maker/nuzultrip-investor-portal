import Link from 'next/link'
import { ArrowLeft, FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-6 py-12">
      <section className="w-full max-w-lg text-center">
        <div className="border-border bg-surface mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border">
          <FileQuestion
            className="text-primary h-8 w-8"
            aria-hidden="true"
          />
        </div>

        <p className="text-primary mt-8 text-sm font-semibold">
          404
        </p>

        <h1 className="text-fg mt-3 text-3xl font-semibold tracking-tight">
          Halaman tidak ditemukan
        </h1>

        <p className="text-fg-muted mx-auto mt-4 max-w-md text-sm leading-6">
          Halaman yang Anda cari mungkin telah dipindahkan, dihapus, atau
          alamat yang dimasukkan tidak tersedia.
        </p>

        <div className="mt-8">
          <Link
            href="/"
            className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali ke Beranda
          </Link>
        </div>
      </section>
    </main>
  )
}
