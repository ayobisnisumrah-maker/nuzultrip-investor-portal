'use client'

import { useFormStatus } from 'react-dom'

export function InquirySubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex min-h-12 items-center justify-center rounded-[3px] bg-[#050505] px-6 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {pending ? 'Mengirim…' : 'Kirim Permintaan Informasi'}
    </button>
  )
}
