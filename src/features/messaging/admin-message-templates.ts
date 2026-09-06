export type AdminMessageTemplate = {
  id: string
  label: string
  body: string
}

export const ADMIN_MESSAGE_TEMPLATES: readonly AdminMessageTemplate[] = [
  {
    id: 'greeting',
    label: 'Salam pembuka',
    body: 'Assalamu’alaikum. Terima kasih telah menghubungi tim Nuzultrip. Ada yang dapat kami bantu terkait informasi investasi Anda?',
  },
  {
    id: 'document-review',
    label: 'Dokumen sedang ditinjau',
    body: 'Terima kasih. Dokumen Anda sudah kami terima dan sedang dalam proses peninjauan. Kami akan mengabari Anda melalui percakapan ini apabila ada informasi tambahan yang diperlukan.',
  },
  {
    id: 'follow-up',
    label: 'Tindak lanjut',
    body: 'Kami ingin menindaklanjuti percakapan sebelumnya. Silakan sampaikan apabila masih ada pertanyaan atau informasi yang ingin dikonfirmasi.',
  },
  {
    id: 'payment-confirmation',
    label: 'Konfirmasi pembayaran',
    body: 'Terima kasih. Informasi pembayaran Anda telah kami terima dan sedang diverifikasi oleh tim terkait. Status terbaru akan kami sampaikan melalui portal ini.',
  },
  {
    id: 'closing',
    label: 'Penutup',
    body: 'Terima kasih atas waktu dan kepercayaan Anda kepada Nuzultrip. Jika ada pertanyaan lanjutan, silakan balas melalui percakapan ini.',
  },
] as const
