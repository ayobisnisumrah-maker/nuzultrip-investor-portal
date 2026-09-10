'use client'

import { useState } from 'react'

function formatPrintedAt(value: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long',
      timeStyle: 'medium',
      timeZone,
      hour12: false,
    }).format(new Date(value))
  } catch {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'long',
      timeStyle: 'medium',
      hour12: false,
    }).format(new Date(value))
  }
}

export function InvoicePrintControls({
  generatedAt,
  printedBy,
  timeZone,
  reference,
}: {
  generatedAt: string
  printedBy: string
  timeZone: string
  reference: string
}) {
  const [printedAt, setPrintedAt] = useState(generatedAt)

  function printInvoice() {
    setPrintedAt(new Date().toISOString())
    window.setTimeout(() => window.print(), 80)
  }

  return (
    <>
      <div className="no-print fixed right-5 top-5 z-50 flex gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Tutup
        </button>
        <button
          type="button"
          onClick={printInvoice}
          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Cetak / Simpan PDF
        </button>
      </div>

      <footer className="avoid-break mt-10 border-t border-slate-200 pt-3 text-[10px] leading-5 text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span>Dicetak pada: {formatPrintedAt(printedAt, timeZone)}</span>
          <span>Dicetak oleh: {printedBy}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span>Nomor dokumen: {reference}</span>
          <span>Sumber: Nuzultrip · Kasir &amp; Invoice</span>
        </div>
      </footer>
    </>
  )
}
