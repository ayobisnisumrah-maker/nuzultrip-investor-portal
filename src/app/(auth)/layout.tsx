import Link from 'next/link'
import { GeometricField, KhatimStar } from '@/ui/geometry/khatim'

/**
 * The authentication shell.
 *
 * Split composition: the form on one side, the identity panel on the other.
 * On narrow viewports the panel collapses to a compact header so the form is
 * the first thing in reach.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(28rem,36rem)]">
      {/* Identity panel — desktop */}
      <aside className="bg-inverse relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <GeometricField className="text-fg-inverse" opacity={0.05} />

        <Link
          href="/"
          className="focus-visible:outline-ring relative flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <KhatimStar variant="filled" className="text-accent-solid size-7" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-heading-md text-fg-inverse">Nuzultrip</span>
            <span className="text-fg-inverse/60 text-[0.6875rem] tracking-[0.1em] uppercase">
              Investor Relations
            </span>
          </span>
        </Link>

        <div className="relative flex max-w-lg flex-col gap-5">
          <p className="text-accent overline">Berjalan bersama</p>
          <p className="font-display text-display-lg text-fg-inverse text-balance">
            Berjalan bersama dan berkembang bersama.
          </p>
          <p className="text-body text-fg-inverse/70">
            Platform hubungan investor Nuzultrip — informasi perusahaan, materi investor, dan
            pelaporan dalam satu tempat yang aman.
          </p>
        </div>

        <p className="text-caption text-fg-inverse/50 relative">
          Platform ini bukan sistem OJK, bukan platform perdagangan efek, dan bukan platform urun
          dana.
        </p>
      </aside>

      {/* Form column */}
      <main
        id="main"
        className="bg-canvas flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14"
      >
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="focus-visible:outline-ring mb-8 inline-flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden"
          >
            <KhatimStar variant="filled" className="text-accent-solid size-6" />
            <span className="font-display text-heading-sm text-fg">Nuzultrip</span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}
