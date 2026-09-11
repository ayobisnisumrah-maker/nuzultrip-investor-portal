'use client'

import { useMemo, useRef, useState } from 'react'

import { Button } from '@/ui/button'

type AlignMode = 'left' | 'center' | 'justify'

export function TermsEditor({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue)
  const [expanded, setExpanded] = useState(false)
  const [fontSize, setFontSize] = useState(15)
  const [align, setAlign] = useState<AlignMode>('left')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const previewLines = useMemo(() => value.split(/\r?\n/), [value])

  function insertHeadingPrefix() {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
    const before = value.slice(0, lineStart)
    const rest = value.slice(lineStart)
    if (/^(PASAL\s+\d+|BAB\s+[IVXLCDM]+|SYARAT\s*&?\s*KETENTUAN)/i.test(rest)) return
    const next = `${before}PASAL — ${rest}`
    setValue(next)
    requestAnimationFrame(() => textarea.focus())
  }

  const editor = (
    <div className="grid gap-3">
      <div className="border-border bg-surface-subtle flex flex-wrap items-center gap-2 rounded-xl border p-2">
        <Button type="button" variant="secondary" onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Kecilkan editor' : 'Besarkan editor'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setFontSize((size) => Math.min(22, size + 1))}>
          A+
        </Button>
        <Button type="button" variant="ghost" onClick={() => setFontSize((size) => Math.max(12, size - 1))}>
          A−
        </Button>
        <Button type="button" variant="ghost" onClick={insertHeadingPrefix}>
          Tandai judul/pasal
        </Button>
        <span className="bg-border mx-1 hidden h-6 w-px sm:block" aria-hidden="true" />
        <Button type="button" variant={align === 'left' ? 'secondary' : 'ghost'} onClick={() => setAlign('left')}>
          Rata kiri
        </Button>
        <Button type="button" variant={align === 'center' ? 'secondary' : 'ghost'} onClick={() => setAlign('center')}>
          Tengah
        </Button>
        <Button type="button" variant={align === 'justify' ? 'secondary' : 'ghost'} onClick={() => setAlign('justify')}>
          Rata kiri-kanan
        </Button>
      </div>

      <textarea
        ref={textareaRef}
        name="termsBody"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={20_000}
        spellCheck
        className="border-border-strong bg-surface text-fg min-h-[360px] w-full resize-y rounded-xl border px-4 py-3 font-sans leading-7 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
        style={{ fontSize, textAlign: align }}
      />

      <div className="border-border rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <strong className="text-body-sm">Pratinjau keterbacaan</strong>
          <span className="text-caption text-fg-muted">Judul/PASAL dibedakan otomatis dari isi.</span>
        </div>
        <div className="max-h-72 overflow-auto text-sm leading-6" style={{ textAlign: align }}>
          {previewLines.map((line, index) => {
            const trimmed = line.trim()
            if (!trimmed) return <div key={index} className="h-3" />
            const heading = /^(PASAL\s+\d+|BAB\s+[IVXLCDM]+|SYARAT\s*&?\s*KETENTUAN|KEBIJAKAN\s+REFUND)/i.test(trimmed)
            return heading ? (
              <div key={index} className="mt-4 mb-1 font-bold text-slate-900 first:mt-0">
                {line}
              </div>
            ) : (
              <div key={index} className="text-slate-700">
                {line}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (!expanded) return editor

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-black/45 p-4 md:p-8">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-4 shadow-2xl md:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Editor Syarat & Ketentuan</h3>
            <p className="text-sm text-slate-500">Mode besar untuk membaca dan menyusun pasal dengan lebih jelas.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setExpanded(false)}>
            Tutup mode besar
          </Button>
        </div>
        {editor}
      </div>
    </div>
  )
}
