# Sinkronisasi lintas modul Nuzultrip Equity

Dokumen ini menetapkan sumber data kanonik agar Dashboard Admin, Portal Investor, laporan keuangan, dan dokumen investor tidak menghasilkan angka berbeda.

| Area | Sumber kanonik | Konsumen |
|---|---|---|
| Kepemilikan | `ownership_holdings` berstatus active dari cap table yang diselesaikan | Investor, Admin, Ownership Statement |
| Penjualan/transfer | `ownership_transfers` melalui RPC workflow | Investor, Admin, audit |
| Pewarisan | `ownership_inheritance` melalui RPC workflow | Investor, Admin, audit |
| Penawaran | `ownership_offerings` yang dipublikasikan | Proposal, term sheet, investor portal |
| Keuangan resmi | financial report snapshot/version berstatus published | Dashboard, distribusi laba, laporan investor |
| Distribusi laba | profit distribution yang telah approved/payable/paid | Investor, laporan distribusi |
| Pembayaran | bank reconciliation dan payment proof yang tervalidasi | Receipt, completion, finance |
| Dokumen | versi dokumen published; versi terbit immutable | Data Room, investor portal |
| Audit | audit log dari server action/RPC | Admin dan pemeriksaan internal |

## Aturan konsistensi

1. Angka kepemilikan dihitung dari holding aktif, bukan input UI.
2. Nilai unit dan persentase memakai snapshot offering terkait.
3. Distribusi laba hanya memakai financial snapshot published dan ownership cutoff yang disahkan.
4. Bukti pembayaran tidak mengubah status saham sebelum completion workflow.
5. Dokumen yang sudah published tidak diedit; koreksi dibuat sebagai versi baru.
6. Realtime hanya mengirim event invalidation tanpa data sensitif; klien melakukan refetch melalui RLS.
7. Setiap perubahan status wajib melalui RPC/server action dengan audit trail.
8. Tampilan Admin dan Investor menggunakan label status yang sama dan tidak membuat status lokal baru.

## Checklist rilis

- Migration diterapkan dan generated database types diperbarui.
- RLS diuji untuk investor lain dan role admin tanpa permission.
- Snapshot keuangan published dipakai pada distribusi.
- Cap table before/after cocok dengan completion transaction.
- Realtime refresh diuji untuk Admin dan Investor.
- Dokumen investor menampilkan periode, versi, status publikasi, dan sumber angka.
