'use client'

import { useFormStatus } from 'react-dom'

export function InquirySubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0b7374] px-6 text-base font-semibold text-white transition-colors hover:bg-[#085e60] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Mengirim…' : 'Kirim Permintaan Informasi'}
    </button>
  )
}
