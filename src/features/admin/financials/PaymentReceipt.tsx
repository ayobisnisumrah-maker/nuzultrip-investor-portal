'use client'

import Image from 'next/image'
import styles from './PaymentReceipt.module.css'

export type PaymentStatus = 'DP' | 'PAID'

export interface PaymentReceiptData {
  orderId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  productType?: string
  packageName: string
  packageCode?: string | null
  packageDescription?: string | null
  pax: number
  packageTotal: number
  subtotal: number
  discount?: number
  otherFee?: number
  tax?: number | null
  invoiceTotal: number
  amountPaid: number
  balanceDue: number
  paymentDatetime?: string | null
  paymentMethod?: string | null
  dueDate?: string | null
  departureDate?: string | null
  termsLink?: string | null
  termsBody?: string | null
  termsLetterheadUrl?: string | null
  refundPolicyLines?: string[]
  companyName?: string
  companyAddress: string
  companyContact?: string | null
  companyLogoUrl?: string | null
  signerName?: string | null
  signerPosition?: string | null
  signatureUrl?: string | null
  stampUrl?: string | null
  status: PaymentStatus
}

function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function safeTermsLink(value?: string | null): string | null {
  if (!value) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

type RefundTableRow = {
  range: string
  refund: string
}

function parseRefundPolicyLines(lines?: string[]): {
  sla: string | null
  rows: RefundTableRow[]
} {
  if (!lines?.length) return { sla: null, rows: [] }

  const [sla, ...tierLines] = lines
  const rows = tierLines.map((line) => {
    const separator = ': pengembalian maksimal '
    const separatorIndex = line.indexOf(separator)

    if (separatorIndex < 0) return { range: line, refund: '—' }

    const range = line.slice(0, separatorIndex).trim()
    const remainder = line.slice(separatorIndex + separator.length).trim()
    const percentMatch = remainder.match(/^([0-9]+(?:[.,][0-9]+)?)%/)

    return {
      range,
      refund: percentMatch ? `${percentMatch[1]}%` : remainder,
    }
  })

  return { sla: sla ?? null, rows }
}

export function PaymentReceipt({ data }: { data: PaymentReceiptData }) {
  const isPaid = data.status === 'PAID'
  const hasTax = typeof data.tax === 'number' && Number.isFinite(data.tax) && data.tax > 0
  const hasDiscount =
    typeof data.discount === 'number' && Number.isFinite(data.discount) && data.discount > 0
  const hasOtherFee =
    typeof data.otherFee === 'number' && Number.isFinite(data.otherFee) && data.otherFee > 0
  const statusIcon = isPaid ? '/images/payment/paid.png' : '/images/payment/dp.png'
  const termsLink = safeTermsLink(data.termsLink)
  const refundPolicy = parseRefundPolicyLines(data.refundPolicyLines)

  const printLayoutCss = `
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 16mm;
      @bottom-right {
        content: 'Halaman ' counter(page) ' dari ' counter(pages);
        color: #818a96;
        font-family: Inter, Arial, Helvetica, sans-serif;
        font-size: 8px;
        line-height: 1;
        vertical-align: middle;
      }
    }

    @media print {
      .${styles.document} {
        display: block !important;
      }

      .${styles.receipt} {
        width: 186mm !important;
        min-height: 269mm !important;
        margin: 0 !important;
        padding: 2mm 0 0 !important;
        box-sizing: border-box !important;
        box-shadow: none !important;
      }

      .${styles.termsPage} {
        break-before: page !important;
        page-break-before: always !important;
      }

      .${styles.printPageCounter} {
        display: flex !important;
        position: fixed !important;
        z-index: 50 !important;
        right: 45mm !important;
        bottom: 4mm !important;
        width: 24mm !important;
        min-height: 7mm !important;
        align-items: center !important;
        justify-content: flex-end !important;
        color: #818a96 !important;
      }

      .${styles.printPageCounter}::after {
        content: none !important;
      }

      .${styles.printPageCounter} .${styles.footerRight} {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 0 !important;
        padding: 0 !important;
      }

      .${styles.printPageCounter} .${styles.footerLogo} {
        width: auto !important;
        max-width: 22mm !important;
        height: 7mm !important;
        object-fit: contain !important;
        object-position: right center !important;
      }

      .${styles.printPageCounter} .${styles.footerBrand} {
        font-size: 8px !important;
      }

      .${styles.footerRight} {
        padding-right: 0 !important;
      }
    }
  `

  return (
    <div className={styles.document} data-testid="payment-receipt">
      <style>{printLayoutCss}</style>
      <div className={styles.printPageCounter} aria-hidden="true">
        <FooterRight data={data} />
      </div>

      <article className={styles.receipt}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Bukti Pembayaran {data.packageName}</h1>
            <p className={styles.orderId}>
              Order ID <strong>#{data.orderId}</strong>
            </p>
          </div>

          <div className={styles.brand}>
            {data.companyLogoUrl ? (
              <Image
                src={data.companyLogoUrl}
                alt={data.companyName ?? 'Nuzultrip'}
                width={168}
                height={52}
                unoptimized
                className={styles.brandLogo}
              />
            ) : (
              <>
                <div className={styles.brandName}>NUZULTRIP</div>
                <div className={styles.brandSubtitle}>Travel &amp; Umrah</div>
              </>
            )}
          </div>
        </header>

        <section className={styles.customerSection}>
          <div className={styles.customerCard}>
            <InfoItem label="Nama Pemesan" value={data.customerName} />
            <InfoItem label="Alamat Email" value={data.customerEmail || '—'} />
            <InfoItem label="Nomor Ponsel" value={data.customerPhone || '—'} />
          </div>

          <div className={styles.statusIconWrapper}>
            <Image
              src={statusIcon}
              alt={isPaid ? 'Status pembayaran PAID' : 'Status pembayaran DP'}
              width={120}
              height={120}
              priority
              className={styles.statusIcon}
            />
          </div>
        </section>

        <section className={styles.paymentSection}>
          <h2 className={styles.sectionTitle}>Detail Pembayaran</h2>
          <div className={styles.paymentCard}>
            <div className={styles.tableHeader}>
              <div>No.</div>
              <div>Produk</div>
              <div>Deskripsi</div>
              <div>Jumlah</div>
              <div className={styles.textRight}>Total</div>
            </div>

            <div className={styles.productRow}>
              <div className={styles.productNo}>1</div>
              <div className={styles.productType}>{data.productType ?? 'Paket Perjalanan'}</div>
              <div className={styles.description}>
                <strong>{data.packageName}</strong>
                {data.packageCode || data.packageDescription ? (
                  <span>
                    {[data.packageCode, data.packageDescription].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </div>
              <div className={styles.quantity}>{data.pax} pax</div>
              <div className={`${styles.amount} ${styles.textRight}`}>
                {formatIDR(data.packageTotal)}
              </div>
            </div>

            <div className={styles.summaryArea}>
              <SummaryRow label="Subtotal" value={formatIDR(data.subtotal)} />
              {hasDiscount ? (
                <SummaryRow label="Potongan Harga" value={`-${formatIDR(data.discount ?? 0)}`} />
              ) : null}
              {hasOtherFee ? (
                <SummaryRow label="Biaya Lainnya" value={formatIDR(data.otherFee ?? 0)} />
              ) : null}
              {hasTax ? (
                <SummaryRow
                  label="Pajak"
                  value={formatIDR(data.tax ?? 0)}
                  valueClassName={styles.taxAmount}
                />
              ) : null}
              <SummaryRow label="Total Tagihan" value={formatIDR(data.invoiceTotal)} strong />
              <SummaryRow
                label="Sudah Dibayar"
                value={formatIDR(data.amountPaid)}
                strong
                valueClassName={styles.paidAmount}
              />
              {!isPaid && data.balanceDue > 0 ? (
                <SummaryRow
                  label="Sisa Tagihan"
                  value={formatIDR(data.balanceDue)}
                  strong
                  valueClassName={styles.balanceAmount}
                />
              ) : null}
            </div>

            <div className={styles.paymentFooter}>
              <div className={styles.paymentMethod}>
                <strong>Waktu &amp; metode pembayaran</strong>
                <span>
                  {data.paymentDatetime || 'Belum ada pembayaran'}
                  {data.paymentMethod ? ` · ${data.paymentMethod}` : ''}
                </span>
              </div>
              <div className={styles.totalPayment}>
                <span>Total pembayaran</span>
                <strong>{formatIDR(data.amountPaid)}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.statusSection}>
          <p className={isPaid ? styles.statusPaid : styles.statusDp}>
            {isPaid
              ? 'Status pembayaran: LUNAS.'
              : `Batas pelunasan: ${data.dueDate || 'Belum ditentukan'}`}
          </p>
          {data.departureDate ? (
            <p className={styles.departureDate}>Keberangkatan: {data.departureDate}</p>
          ) : null}
        </section>

        {data.signatureUrl || data.stampUrl || data.signerName || data.signerPosition ? (
          <section className={styles.signatureSection}>
            <div className={styles.signature}>
              <div
                className={styles.signatureImages}
                style={{ width: 250, height: 145, marginTop: 0 }}
              >
                {data.signatureUrl ? (
                  <Image
                    src={data.signatureUrl}
                    alt="Tanda tangan"
                    width={220}
                    height={110}
                    unoptimized
                    className={styles.signatureImage}
                    style={{ maxWidth: 210, height: 96 }}
                  />
                ) : null}
                {data.stampUrl ? (
                  <Image
                    src={data.stampUrl}
                    alt="Stempel perusahaan"
                    width={140}
                    height={140}
                    unoptimized
                    className={styles.stampImage}
                    style={{ width: 126, height: 126 }}
                  />
                ) : null}
              </div>
              {data.signerName || data.signerPosition ? (
                <strong className={styles.signer}>
                  {[data.signerName, data.signerPosition].filter(Boolean).join(' · ')}
                </strong>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className={styles.issuerSection}>
          <div className={styles.issuerLeft}>
            <strong className={styles.companyName}>
              {data.companyName ?? 'PT Swarna Dipa Wisata'}
            </strong>
            <span className={styles.companyAddress}>{data.companyAddress}</span>
          </div>

          {data.companyContact ? (
            <div className={styles.issuerRight}>
              <span className={styles.smallLabel}>Kontak</span>
              <span className={styles.companyContact}>{data.companyContact}</span>
            </div>
          ) : null}
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerText}>
            <span className={styles.termsNotice}>
              Syarat &amp; Ketentuan tercantum mulai halaman 2.
              {termsLink ? (
                <>
                  {' '}Referensi tambahan:{' '}
                  <a href={termsLink} target="_blank" rel="noreferrer">
                    {termsLink}
                  </a>
                </>
              ) : null}
            </span>
            <span>Dokumen dibuat otomatis oleh sistem Nuzultrip.</span>
          </div>
          <FooterRight data={data} />
        </footer>
      </article>

      <article className={`${styles.receipt} ${styles.termsPage}`} data-testid="payment-terms-page">
        {data.termsLetterheadUrl ? (
          <div className={styles.letterhead}>
            <Image
              src={data.termsLetterheadUrl}
              alt="Kop surat Syarat & Ketentuan"
              width={1600}
              height={360}
              unoptimized
              className={styles.letterheadImage}
            />
          </div>
        ) : (
          <header className={styles.termsFallbackHeader}>
            <strong>{data.companyName ?? 'PT Swarna Dipa Wisata (Nuzultrip)'}</strong>
            <span>{data.companyAddress}</span>
          </header>
        )}

        <section className={styles.termsContent}>
          <p className={styles.termsEyebrow}>INVOICE {data.orderId}</p>
          <h2 className={styles.termsTitle}>Syarat &amp; Ketentuan Pemesanan dan Pembayaran</h2>

          {data.termsBody ? (
            <div className={styles.termsBody}>{data.termsBody}</div>
          ) : (
            <p className={styles.termsEmpty}>
              Ketentuan tertulis belum tersedia pada snapshot invoice ini.
              {termsLink ? ` Referensi syarat: ${termsLink}` : ''}
            </p>
          )}

          {data.refundPolicyLines?.length ? (
            <div className={styles.refundTerms}>
              <h3>Kebijakan Refund</h3>
              {refundPolicy.sla ? <p className={styles.refundSla}>{refundPolicy.sla}</p> : null}
              {refundPolicy.rows.length ? (
                <table className={styles.refundTable}>
                  <thead>
                    <tr>
                      <th>Rentang pembatalan sebelum keberangkatan</th>
                      <th>Maksimal refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundPolicy.rows.map((row) => (
                      <tr key={`${row.range}-${row.refund}`}>
                        <td>{row.range}</td>
                        <td>{row.refund}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              <p className={styles.refundTableNote}>
                Persentase dihitung dari pembayaran yang telah diterima, dengan tetap memperhatikan
                komponen non-refundable dan hasil rekonsiliasi transaksi sesuai Syarat &amp;
                Ketentuan invoice.
              </p>
            </div>
          ) : null}

          <div className={styles.acceptanceBox}>
            <strong>Persetujuan pelanggan</strong>
            <p>
              Dengan melakukan pembayaran atas invoice ini, pelanggan menyatakan telah membaca,
              memahami, dan menyetujui Syarat &amp; Ketentuan yang tercantum pada dokumen ini.
            </p>
          </div>
        </section>

        <footer className={`${styles.footer} ${styles.termsFooter}`}>
          <div className={styles.footerText}>
            <span>{data.companyName ?? 'PT Swarna Dipa Wisata (Nuzultrip)'}</span>
            <span>Dokumen syarat ini merupakan bagian tidak terpisahkan dari invoice.</span>
          </div>
          <FooterRight data={data} />
        </footer>
      </article>
    </div>
  )
}

function FooterRight({ data }: { data: PaymentReceiptData }) {
  return (
    <div className={styles.footerRight}>
      {data.companyLogoUrl ? (
        <Image
          src={data.companyLogoUrl}
          alt={data.companyName ?? 'Nuzultrip'}
          width={84}
          height={26}
          unoptimized
          className={styles.footerLogo}
        />
      ) : (
        <span className={styles.footerBrand}>NUZULTRIP</span>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>{label}</span>
      <strong className={styles.infoValue}>{value}</strong>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  strong = false,
  valueClassName = '',
}: {
  label: string
  value: string
  strong?: boolean
  valueClassName?: string
}) {
  return (
    <div className={styles.summaryRow}>
      <span>{label}</span>
      {strong ? (
        <strong className={valueClassName}>{value}</strong>
      ) : (
        <span className={`${styles.summaryValue} ${valueClassName}`}>{value}</span>
      )}
    </div>
  )
}
