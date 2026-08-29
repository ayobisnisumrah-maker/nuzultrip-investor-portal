'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  createPortalNavigation,
  deletePortalNavigation,
  reorderPortalNavigation,
  setPortalNavigationVisibility,
  updatePortalNavigation,
} from '@/server/portal/navigation-actions'

import type { PortalNavigationItem } from '@/server/portal/navigation-queries'

type NavLocation = 'header' | 'footer' | 'legal' | 'social'
type NavTarget = '_self' | '_blank'

type FormState = {
  label: string
  href: string
  target: NavTarget
  location: NavLocation
  parentId: string
  icon: string
}

const LOCATION_OPTIONS: Array<{
  value: NavLocation
  label: string
  description: string
}> = [
  {
    value: 'header',
    label: 'Header',
    description: 'Navigasi utama pada bagian atas portal.',
  },
  {
    value: 'footer',
    label: 'Footer',
    description: 'Navigasi umum pada bagian bawah portal.',
  },
  {
    value: 'legal',
    label: 'Legal',
    description: 'Privacy policy, terms, dan informasi hukum.',
  },
  {
    value: 'social',
    label: 'Social',
    description: 'Tautan media sosial dan kanal eksternal.',
  },
]

const EMPTY_FORM: FormState = {
  label: '',
  href: '',
  target: '_self',
  location: 'header',
  parentId: '',
  icon: '',
}

function getLocationLabel(location: NavLocation) {
  return LOCATION_OPTIONS.find((item) => item.value === location)?.label ?? location
}

export function PortalNavigationManager({
  initialItems,
}: {
  initialItems: PortalNavigationItem[]
}) {
  const router = useRouter()

  const [items, setItems] = useState(initialItems)
  const [activeLocation, setActiveLocation] = useState<NavLocation>('header')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [pending, startTransition] = useTransition()

  const locationItems = useMemo(
    () =>
      items
        .filter((item) => item.location === activeLocation)
        .sort((a, b) => a.position - b.position),
    [activeLocation, items],
  )

  const parentOptions = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.location === form.location && item.parent_id === null && item.id !== editingId,
        )
        .sort((a, b) => a.position - b.position),
    [editingId, form.location, items],
  )

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function resetForm() {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      location: activeLocation,
    })
    setError(null)
    setMessage(null)
  }

  function startCreate() {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      location: activeLocation,
    })
    setError(null)
    setMessage(null)
  }

  function startEdit(item: PortalNavigationItem) {
    setEditingId(item.id)

    setForm({
      label: item.label,
      href: item.href,
      target: item.target === '_blank' ? '_blank' : '_self',
      location: item.location,
      parentId: item.parent_id ?? '',
      icon: item.icon ?? '',
    })

    setError(null)
    setMessage(null)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError(null)
    setMessage(null)

    startTransition(async () => {
      try {
        if (editingId) {
          await updatePortalNavigation({
            id: editingId,
            label: form.label,
            href: form.href,
            target: form.target,
            location: form.location,
            parentId: form.parentId || null,
            icon: form.icon,
          })

          setMessage('Navigation berhasil diperbarui.')
        } else {
          await createPortalNavigation({
            label: form.label,
            href: form.href,
            target: form.target,
            location: form.location,
            parentId: form.parentId || null,
            icon: form.icon,
          })

          setMessage('Navigation berhasil dibuat.')
        }

        resetForm()
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan.')
      }
    })
  }

  function toggleVisibility(item: PortalNavigationItem) {
    setError(null)
    setMessage(null)

    startTransition(async () => {
      try {
        await setPortalNavigationVisibility({
          id: item.id,
          isVisible: !item.is_visible,
        })

        setMessage(
          `Navigation "${item.label}" ${item.is_visible ? 'disembunyikan' : 'ditampilkan'}.`,
        )

        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan.')
      }
    })
  }

  function handleDelete(item: PortalNavigationItem) {
    const confirmed = window.confirm(
      `Hapus navigation "${item.label}"? Tindakan ini tidak dapat dibatalkan.`,
    )

    if (!confirmed) return

    setError(null)
    setMessage(null)

    startTransition(async () => {
      try {
        await deletePortalNavigation({
          id: item.id,
        })

        if (editingId === item.id) {
          resetForm()
        }

        setMessage(`Navigation "${item.label}" berhasil dihapus.`)
        router.refresh()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan.')
      }
    })
  }

  function moveItem(item: PortalNavigationItem, direction: 'up' | 'down') {
    const currentItems = locationItems
    const currentIndex = currentItems.findIndex((entry) => entry.id === item.id)

    if (currentIndex < 0) return

    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (nextIndex < 0 || nextIndex >= currentItems.length) return

    const reordered = [...currentItems]

    const [moved] = reordered.splice(currentIndex, 1)

    if (!moved) return

    reordered.splice(nextIndex, 0, moved)

    const previousItems = items

    const reorderedIds = reordered.map((entry) => entry.id)

    setItems((current) => {
      const map = new Map(
        reordered.map((entry, position) => [
          entry.id,
          {
            ...entry,
            position,
          },
        ]),
      )

      return current.map((entry) => map.get(entry.id) ?? entry)
    })

    setError(null)
    setMessage(null)

    startTransition(async () => {
      try {
        await reorderPortalNavigation({
          location: activeLocation,
          ids: reorderedIds,
        })

        setMessage('Urutan navigation berhasil diperbarui.')
        router.refresh()
      } catch (cause) {
        setItems(previousItems)
        setError(cause instanceof Error ? cause.message : 'Gagal mengubah urutan navigation.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="border-border bg-surface rounded-xl border p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
              Portal Navigation
            </p>

            <h1 className="font-display text-heading-lg text-fg mt-1">Navigation Manager</h1>

            <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">
              Kelola seluruh navigation yang digunakan pada public investor portal.
            </p>
          </div>

          <button
            type="button"
            onClick={startCreate}
            disabled={pending}
            className="bg-primary text-primary-foreground inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tambah Navigation
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {LOCATION_OPTIONS.map((location) => (
            <button
              key={location.value}
              type="button"
              disabled={pending}
              onClick={() => {
                setActiveLocation(location.value)

                if (!editingId) {
                  setForm((current) => ({
                    ...current,
                    location: location.value,
                    parentId: '',
                  }))
                }
              }}
              className={[
                'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                activeLocation === location.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-fg hover:bg-muted',
              ].join(' ')}
            >
              {location.label}
            </button>
          ))}
        </div>

        <p className="text-caption text-fg-subtle mt-3">
          {LOCATION_OPTIONS.find((item) => item.value === activeLocation)?.description}
        </p>
      </div>

      {message ? (
        <div className="border-success/30 bg-success/10 text-fg rounded-xl border px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="border-destructive/30 bg-destructive/10 text-fg rounded-xl border px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="border-border bg-surface overflow-hidden rounded-xl border">
          <div className="border-border flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="text-fg font-semibold">{getLocationLabel(activeLocation)}</h2>

              <p className="text-caption text-fg-subtle mt-1">{locationItems.length} navigation</p>
            </div>
          </div>

          {locationItems.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-fg font-medium">Belum ada navigation</p>

              <p className="text-body-sm text-fg-muted mt-2">
                Tambahkan navigation pertama untuk {getLocationLabel(activeLocation).toLowerCase()}.
              </p>
            </div>
          ) : (
            <div className="divide-border divide-y">
              {locationItems.map((item, index) => {
                const parent = item.parent_id
                  ? items.find((entry) => entry.id === item.parent_id)
                  : null

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-fg font-medium">{item.label}</p>

                        {!item.is_visible ? (
                          <span className="border-border text-fg-subtle rounded-md border px-2 py-0.5 text-[11px] font-medium">
                            Hidden
                          </span>
                        ) : null}

                        {parent ? (
                          <span className="bg-muted text-fg-muted rounded-md px-2 py-0.5 text-[11px]">
                            Submenu: {parent.label}
                          </span>
                        ) : null}

                        {item.target === '_blank' ? (
                          <span className="bg-muted text-fg-muted rounded-md px-2 py-0.5 text-[11px]">
                            External
                          </span>
                        ) : null}
                      </div>

                      <p className="text-caption text-fg-subtle mt-1 truncate">{item.href}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={pending || index === 0}
                        onClick={() => moveItem(item, 'up')}
                        className="border-border text-fg hover:bg-muted rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        disabled={pending || index === locationItems.length - 1}
                        onClick={() => moveItem(item, 'down')}
                        className="border-border text-fg hover:bg-muted rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggleVisibility(item)}
                        className="border-border text-fg hover:bg-muted rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                      >
                        {item.is_visible ? 'Sembunyikan' : 'Tampilkan'}
                      </button>

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startEdit(item)}
                        className="border-border text-fg hover:bg-muted rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleDelete(item)}
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <aside className="border-border bg-surface h-fit rounded-xl border p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-fg font-semibold">
                {editingId ? 'Edit Navigation' : 'Tambah Navigation'}
              </h2>

              <p className="text-caption text-fg-subtle mt-1">Konfigurasi tautan portal.</p>
            </div>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                disabled={pending}
                className="text-fg-muted hover:text-fg text-xs font-medium"
              >
                Batal
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-body-sm text-fg font-medium">Label</span>

              <input
                value={form.label}
                onChange={(event) => updateForm('label', event.target.value)}
                disabled={pending}
                required
                maxLength={120}
                placeholder="Contoh: Tentang Kami"
                className="border-border bg-background text-fg focus:ring-primary/30 mt-2 min-h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 disabled:opacity-50"
              />
            </label>

            <label className="block">
              <span className="text-body-sm text-fg font-medium">URL / Path</span>

              <input
                value={form.href}
                onChange={(event) => updateForm('href', event.target.value)}
                disabled={pending}
                required
                maxLength={2000}
                placeholder="/tentang atau https://..."
                className="border-border bg-background text-fg focus:ring-primary/30 mt-2 min-h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 disabled:opacity-50"
              />
            </label>

            <label className="block">
              <span className="text-body-sm text-fg font-medium">Location</span>

              <select
                value={form.location}
                onChange={(event) => {
                  const location = event.target.value as NavLocation

                  setForm((current) => ({
                    ...current,
                    location,
                    parentId: '',
                  }))
                }}
                disabled={pending}
                className="border-border bg-background text-fg focus:ring-primary/30 mt-2 min-h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 disabled:opacity-50"
              >
                {LOCATION_OPTIONS.map((location) => (
                  <option key={location.value} value={location.value}>
                    {location.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-body-sm text-fg font-medium">Target</span>

              <select
                value={form.target}
                onChange={(event) => updateForm('target', event.target.value as NavTarget)}
                disabled={pending}
                className="border-border bg-background text-fg focus:ring-primary/30 mt-2 min-h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 disabled:opacity-50"
              >
                <option value="_self">Buka di halaman yang sama</option>
                <option value="_blank">Buka tab baru</option>
              </select>
            </label>

            <label className="block">
              <span className="text-body-sm text-fg font-medium">Parent Navigation</span>

              <select
                value={form.parentId}
                onChange={(event) => updateForm('parentId', event.target.value)}
                disabled={pending}
                className="border-border bg-background text-fg focus:ring-primary/30 mt-2 min-h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 disabled:opacity-50"
              >
                <option value="">Tidak ada (Navigation utama)</option>

                {parentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-body-sm text-fg font-medium">Icon (opsional)</span>

              <input
                value={form.icon}
                onChange={(event) => updateForm('icon', event.target.value)}
                disabled={pending}
                maxLength={100}
                placeholder="Nama icon"
                className="border-border bg-background text-fg focus:ring-primary/30 mt-2 min-h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 disabled:opacity-50"
              />
            </label>

            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-primary-foreground inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Buat Navigation'}
            </button>
          </form>
        </aside>
      </div>
    </div>
  )
}
