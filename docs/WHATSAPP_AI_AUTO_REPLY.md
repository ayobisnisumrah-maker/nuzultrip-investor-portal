# WhatsApp AI Auto Reply

## Tujuan
Menghubungkan pesan WhatsApp Cloud API yang masuk ke Halo Nuzul sehingga pertanyaan teks dapat dijawab otomatis dengan sumber fakta yang sama dengan portal publik Nuzultrip.

## Invariant keamanan
- Webhook GET diverifikasi dengan server-only verify token.
- Webhook POST wajib lolos HMAC SHA-256 `X-Hub-Signature-256` menggunakan Meta App Secret.
- Access token, verify token, App Secret, dan OpenAI API key tidak pernah disimpan di CMS/browser.
- Hanya pesan teks inbound untuk Phone Number ID yang dikonfigurasi yang diproses.
- `wamid` harus idempotent agar retry webhook tidak menghasilkan balasan ganda.
- AI hanya memakai snapshot portal publik yang published; draft/admin tidak menjadi knowledge source.
- Jawaban tidak boleh mengarang harga, izin, legalitas, jadwal, atau hasil investasi.
- Jika informasi tidak tersedia, arahkan ke kanal resmi.
- Pesan dari bot sendiri/status delivery tidak diproses sebagai pertanyaan.
- Provider/OpenAI failure tidak ditandai sukses dan dapat diretry secara terkendali.

## Pengaturan Admin
Tambahkan toggle terpisah `Jawab otomatis dengan Halo Nuzul`. Pengiriman template transaksional yang sudah ada tetap independen.

## Secrets production
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_GRAPH_API_VERSION`
- `OPENAI_API_KEY`
- `HALO_NUZUL_MODEL`

## Release gate
Migration reset, generated DB types, typecheck, lint, unit/integration, webhook signature/idempotency tests, Browser E2E, dan production build harus hijau pada exact SHA sebelum merge.
