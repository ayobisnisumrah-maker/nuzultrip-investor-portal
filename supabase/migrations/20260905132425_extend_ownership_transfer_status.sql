-- Tambahkan status "processing" untuk tahap Dalam Proses.
-- Dipisahkan ke migration tersendiri agar enum value sudah committed
-- sebelum dipakai oleh constraint/index pada migration berikutnya.

alter type public.ownership_transfer_status
  add value if not exists 'processing'
  after 'approved';
