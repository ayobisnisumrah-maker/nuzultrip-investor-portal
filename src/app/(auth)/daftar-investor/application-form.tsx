'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { submitInvestorApplication } from '@/server/investors/actions'
import { MIN_PASSWORD_LENGTH } from '@/core/auth/schemas'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Checkbox, ChoiceRow } from '@/ui/checkbox'
import { Field } from '@/ui/field'
import { Input, Textarea } from '@/ui/input'
import { Grid, Stack } from '@/ui/layout'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import { readField } from '@/lib/form-data'
import { useAction } from '@/ui/use-action'

export function InvestorApplicationForm() {
  const { pending, data, errorMessage, correlationId, fieldError, run } =
    useAction(submitInvestorApplication)
  const [investorType, setInvestorType] = useState<'individual' | 'institution'>('individual')
  const [acceptTerms, setAcceptTerms] = useState(false)

  if (data) {
    return (
      <Alert tone="success" title="Pengajuan diterima">
        <Stack gap={2}>
          <p>
            Nomor referensi Anda: <strong className="font-mono">{data.referenceCode}</strong>
          </p>
          <p>
            Kami telah mengirim tautan konfirmasi ke <strong>{data.email}</strong>. Konfirmasikan
            alamat surel Anda terlebih dahulu. Akses ke materi investor dibuka setelah pengajuan
            ditinjau dan disetujui.
          </p>
        </Stack>
      </Alert>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const value = (key: string) => readField(form, key)

        run({
          fullName: value('fullName'),
          email: value('email'),
          password: value('password'),
          phone: value('phone'),
          investorType,
          legalName: value('legalName'),
          country: value('country') || 'ID',
          city: value('city'),
          address: value('address'),
          organizationName: value('organizationName'),
          organizationRole: value('organizationRole'),
          applicationNote: value('applicationNote'),
          identityNumber: value('identityNumber'),
          acceptTerms: acceptTerms as true,
        })
      }}
    >
      <Stack gap={6}>
        {errorMessage ? (
          <Alert tone="danger" title="Pengajuan tidak dapat dikirim">
            {errorMessage}
            {correlationId ? (
              <span className="text-caption text-fg-subtle mt-1 block">
                Kode referensi: <code className="font-mono">{correlationId}</code>
              </span>
            ) : null}
          </Alert>
        ) : null}

        <fieldset className="flex flex-col gap-5">
          <legend className="text-fg-subtle pb-2 overline">Akun</legend>
          <Grid min="16rem" gap={5}>
            <Field label="Nama lengkap" error={fieldError('fullName')} required>
              <Input name="fullName" autoComplete="name" required autoFocus />
            </Field>
            <Field label="Surel" error={fieldError('email')} required>
              <Input name="email" type="email" autoComplete="email" inputMode="email" required />
            </Field>
            <Field
              label="Kata sandi"
              hint={`Minimal ${MIN_PASSWORD_LENGTH} karakter, dengan huruf kapital, huruf kecil, dan angka.`}
              error={fieldError('password')}
              required
            >
              <Input name="password" type="password" autoComplete="new-password" required />
            </Field>
            <Field label="Telepon" error={fieldError('phone')}>
              <Input name="phone" type="tel" autoComplete="tel" inputMode="tel" />
            </Field>
          </Grid>
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="text-fg-subtle pb-2 overline">Identitas investor</legend>
          <Grid min="16rem" gap={5}>
            <Field label="Jenis investor" required>
              <Select
                value={investorType}
                onValueChange={(value) => setInvestorType(value as typeof investorType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Perorangan</SelectItem>
                  <SelectItem value="institution">Institusi</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Nama sesuai identitas"
              hint="Nama perorangan atau badan hukum."
              error={fieldError('legalName')}
              required
            >
              <Input name="legalName" required />
            </Field>

            {investorType === 'institution' ? (
              <>
                <Field label="Nama institusi" error={fieldError('organizationName')} required>
                  <Input name="organizationName" required />
                </Field>
                <Field label="Jabatan" error={fieldError('organizationRole')}>
                  <Input name="organizationRole" />
                </Field>
              </>
            ) : null}

            <Field
              label="Nomor identitas"
              hint="Disimpan dalam bentuk terenkripsi satu arah, tidak pernah ditampilkan kembali."
              error={fieldError('identityNumber')}
            >
              <Input name="identityNumber" autoComplete="off" />
            </Field>

            <Field label="Negara" hint="Kode dua huruf, misal ID." error={fieldError('country')}>
              <Input name="country" defaultValue="ID" maxLength={2} className="uppercase" />
            </Field>

            <Field label="Kota" error={fieldError('city')}>
              <Input name="city" autoComplete="address-level2" />
            </Field>
          </Grid>

          <Field label="Alamat" error={fieldError('address')}>
            <Textarea name="address" rows={2} autoComplete="street-address" />
          </Field>
        </fieldset>

        <Field
          label="Catatan pengajuan"
          hint="Sampaikan hal yang perlu kami ketahui. Opsional."
          error={fieldError('applicationNote')}
        >
          <Textarea name="applicationNote" rows={4} />
        </Field>

        <div className="flex flex-col gap-1.5">
          <ChoiceRow
            htmlFor="acceptTerms"
            control={
              <Checkbox
                id="acceptTerms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked === true)}
              />
            }
            label="Saya menyetujui ketentuan penggunaan dan pemrosesan data"
            hint="Data Anda digunakan untuk keperluan hubungan investor dan tidak dibagikan kepada pihak ketiga tanpa persetujuan."
          />
          {fieldError('acceptTerms') ? (
            <p className="text-caption text-danger-fg">{fieldError('acceptTerms')}</p>
          ) : null}
        </div>

        <Button type="submit" size="lg" fullWidth loading={pending}>
          <CheckCircle2 aria-hidden="true" />
          Kirim pengajuan
        </Button>
      </Stack>
    </form>
  )
}
