'use client'

import Link from 'next/link'
import { createFirstSuperAdmin } from '@/server/admin/setup-actions'
import { readField } from '@/lib/form-data'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Field } from '@/ui/field'
import { Input } from '@/ui/input'
import { Stack } from '@/ui/layout'
import { useAction } from '@/ui/use-action'

export function SetupForm({ minPasswordLength }: { minPasswordLength: number }) {
  const { pending, data, errorMessage, correlationId, fieldError, run } =
    useAction(createFirstSuperAdmin)

  if (data) {
    return (
      <Alert tone="success" title="Super Admin berhasil dibuat">
        <Stack gap={3}>
          <p>
            Akun <strong>{data.email}</strong> telah dibuat dengan peran Super Admin.
          </p>
          <Link href="/masuk" className="text-primary underline-offset-4 hover:underline">
            Lanjutkan ke halaman masuk
          </Link>
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
        run({
          fullName: readField(form, 'fullName'),
          email: readField(form, 'email'),
          password: readField(form, 'password'),
          confirmPassword: readField(form, 'confirmPassword'),
        })
      }}
    >
      <Stack gap={5}>
        {errorMessage ? (
          <Alert tone="danger" title="Tidak dapat membuat akun">
            {errorMessage}
            {correlationId ? (
              <span className="text-caption text-fg-subtle mt-1 block">
                Kode referensi: <code className="font-mono">{correlationId}</code>
              </span>
            ) : null}
          </Alert>
        ) : null}

        <Field label="Nama lengkap" error={fieldError('fullName')} required>
          <Input name="fullName" autoComplete="name" required autoFocus />
        </Field>

        <Field label="Surel" error={fieldError('email')} required>
          <Input name="email" type="email" autoComplete="email" inputMode="email" required />
        </Field>

        <Field
          label="Kata sandi"
          hint={`Minimal ${minPasswordLength} karakter, dengan huruf kapital, huruf kecil, dan angka.`}
          error={fieldError('password')}
          required
        >
          <Input name="password" type="password" autoComplete="new-password" required />
        </Field>

        <Field label="Konfirmasi kata sandi" error={fieldError('confirmPassword')} required>
          <Input name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={pending}>
          Buat Super Admin
        </Button>
      </Stack>
    </form>
  )
}
