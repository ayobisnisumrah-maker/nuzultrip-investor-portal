'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/server/auth/actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Field } from '@/ui/field'
import { Input } from '@/ui/input'
import { Stack } from '@/ui/layout'
import { readField } from '@/lib/form-data'
import { useAction } from '@/ui/use-action'

export function SignInForm({
  redirectTo,
  initialError,
}: {
  redirectTo?: string
  initialError?: string
}) {
  const router = useRouter()
  const { pending, data, errorMessage, correlationId, fieldError, run } = useAction(signIn)
  const [dismissedInitial, setDismissedInitial] = useState(false)

  useEffect(() => {
    if (data?.destination) {
      // `refresh()` first so the layout re-renders with the new session before
      // the navigation lands; otherwise the destination briefly renders as
      // signed-out.
      router.refresh()
      router.replace(data.destination)
    }
  }, [data, router])

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        setDismissedInitial(true)
        const form = new FormData(event.currentTarget)
        run({
          email: readField(form, 'email'),
          password: readField(form, 'password'),
          ...(redirectTo ? { redirectTo } : {}),
        })
      }}
    >
      <Stack gap={5}>
        {initialError && !dismissedInitial ? <Alert tone="warning">{initialError}</Alert> : null}

        {errorMessage ? (
          <Alert tone="danger" title="Tidak dapat masuk">
            {errorMessage}
            {correlationId ? (
              <span className="text-caption text-fg-subtle mt-1 block">
                Kode referensi: <code className="font-mono">{correlationId}</code>
              </span>
            ) : null}
          </Alert>
        ) : null}

        <Field label="Surel" error={fieldError('email')} required>
          <Input
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            autoFocus
            placeholder="nama@perusahaan.co.id"
          />
        </Field>

        <Field label="Kata sandi" error={fieldError('password')} required>
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={pending}>
          Masuk
        </Button>
      </Stack>
    </form>
  )
}
