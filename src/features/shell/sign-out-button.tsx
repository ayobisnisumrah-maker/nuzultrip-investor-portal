'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { signOut } from '@/server/auth/actions'
import { Button } from '@/ui/button'
import { useAction } from '@/ui/use-action'

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const { pending, data, run } = useAction(signOut)

  useEffect(() => {
    if (data?.ok) {
      // `refresh()` clears the cached RSC payload for the signed-in layout;
      // without it the shell would briefly re-render with the old session.
      router.refresh()
      router.replace('/masuk')
    }
  }, [data, router])

  return (
    <Button
      variant="ghost"
      size={compact ? 'icon' : 'sm'}
      loading={pending}
      onClick={() => run(undefined)}
      aria-label={compact ? 'Keluar' : undefined}
    >
      <LogOut aria-hidden="true" />
      {compact ? null : 'Keluar'}
    </Button>
  )
}
