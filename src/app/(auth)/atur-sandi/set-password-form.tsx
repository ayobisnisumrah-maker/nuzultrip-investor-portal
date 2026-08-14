'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updatePassword } from '@/server/auth/actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Field } from '@/ui/field'
import { Input } from '@/ui/input'
import { Stack } from '@/ui/layout'
import { readField } from '@/lib/form-data'
import { useAction } from '@/ui/use-action'

export function SetPasswordForm({ destination }: { destination: string }) {
  const router = useRouter()
  const { pending, data, errorMessage, fieldError, run } = useAction(updatePassword)

  useEffect(() => {
    if (data?.updated) {
      router.refresh()
      router.replace(destination)
    }
  }, [data, destination, router])

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        run({
          password: readField(form, 'password'),
          confirmPassword: readField(form, 'confirmPassword'),
        })
      }}
    >
      <Stack gap={5}>
        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}

        <Field label="Kata sandi baru" error={fieldError('password')} required>
          <Input name="password" type="password" autoComplete="new-password" required autoFocus />
        </Field>

        <Field label="Konfirmasi kata sandi" error={fieldError('confirmPassword')} required>
          <Input name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={pending}>
          Simpan kata sandi
        </Button>
      </Stack>
    </form>
  )
}
