import { Overline } from '@/ui/primitives'
import { TessellationBand } from '@/ui/geometry/khatim'

export default function Home() {
  return (
    <main
      id="main"
      className="max-w-narrow mx-auto flex min-h-dvh flex-col justify-center gap-5 px-6"
    >
      <Overline tone="accent">Investor Relations</Overline>
      <h1 className="font-display text-display-lg text-fg">Nuzultrip Investor Portal</h1>
      <p className="text-body-lg text-fg-muted max-w-prose">
        Berjalan bersama dan berkembang bersama.
      </p>
      <TessellationBand height={32} className="my-2" />
      <p className="text-body-sm text-fg-subtle">
        Fase fondasi. Portal publik disusun dari konten CMS pada Fase 9 — lihat{' '}
        <code className="text-fg-muted">docs/ROADMAP.md</code>.
      </p>
    </main>
  )
}
