import Image from 'next/image'
import Link from 'next/link'
import { GeometricField, KhatimStar } from '@/ui/geometry/khatim'
import { getPublicBrandLogo } from '@/server/portal/public-branding'

import styles from './auth-layout.module.css'

/**
 * The authentication shell.
 *
 * Split composition: the form on one side, the identity panel on the other.
 * On narrow viewports the panel collapses to a compact header so the form is
 * the first thing in reach.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const brandLogoUrl = await getPublicBrandLogo()

  const brand = brandLogoUrl ? (
    <Image
      src={brandLogoUrl}
      alt="Nuzultrip"
      width={190}
      height={64}
      className="h-11 w-auto max-w-52 rounded-sm bg-white object-contain object-left px-2 py-1.5"
      priority
    />
  ) : (
    <>
      <KhatimStar variant="filled" className="size-7 text-white" />
      <span className="flex flex-col leading-tight">
        <span className="text-heading-md text-white">Nuzultrip</span>
        <span className="text-[0.6875rem] tracking-[0.1em] text-white/60 uppercase">
          Investor Relations
        </span>
      </span>
    </>
  )

  return (
    <div className={`${styles.authTheme} grid min-h-dvh lg:grid-cols-[1fr_minmax(28rem,36rem)]`}>
      {/* Identity panel — desktop */}
      <aside className="relative hidden overflow-hidden bg-black lg:flex lg:flex-col lg:justify-between lg:p-12">
        <GeometricField className="text-fg-inverse" opacity={0.05} />

        <Link
          href="/"
          className="focus-visible:outline-ring relative flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {brand}
        </Link>

        <div className="relative flex max-w-lg flex-col gap-5">
          <p className="text-white/60 overline">Nuzultrip Equity</p>
          <p className="text-display-lg text-balance text-white">
            Membangun Nilai dan Kepemilikan Bersama Nuzultrip.
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
            {brandLogoUrl ? (
              <Image
                src={brandLogoUrl}
                alt="Nuzultrip"
                width={170}
                height={56}
                className="h-8 w-auto max-w-44 object-contain object-left"
                priority
              />
            ) : (
              <>
                <KhatimStar variant="filled" className="size-6 text-black" />
                <span className="text-heading-sm text-fg">Nuzultrip</span>
              </>
            )}
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}
