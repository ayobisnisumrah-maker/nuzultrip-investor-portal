'use client'

import { requestPasswordReset } from '@/server/auth/actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Field } from '@/ui/field'
import { Input } from '@/ui/input'
import { Stack } from '@/ui/layout'
import { readField } from '@/lib/form-data'
import { useAction } from '@/ui/use-action'

export function PasswordResetForm() {
  const { pending, data, errorMessage, fieldError, run } = useAction(requestPasswordReset)

  if (data?.sent) {
    return (
      <Alert tone="success" title="Periksa surel Anda">
        {/*
          The same message is shown whether or not the address is registered.
          Confirming that an address exists here would turn this form into an
          account-existence oracle.
        */}
        Jika alamat tersebut terdaftar, tautan pemulihan telah dikirim. Tautan berlaku terbatas dan
        hanya dapat digunakan satu kali.
      </Alert>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        run({ email: readField(form, 'email') })
      }}
    >
      <Stack gap={5}>
        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}

        <Field label="Surel" error={fieldError('email')} required>
          <Input
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            autoFocus
          />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={pending}>
          Kirim tautan pemulihan
        </Button>
      </Stack>
    </form>
  )
}
