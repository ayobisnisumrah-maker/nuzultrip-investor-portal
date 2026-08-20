'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { updateRole } from '@/server/admin/role-actions'

type DatabasePermission = {
  id: string
  key: string
  module: string
  action: string
  description: string
  is_dangerous: boolean
}

type PermissionGroup = {
  module: string
  label: string
  permissions: ReadonlyArray<{
    module: string
    action: string
    description: string
  }>
}

type RoleEditorProps = {
  role: {
    id: string
    key: string
    name: string
    description: string
    isSystem: boolean
    permissionVersion: number
  }
  permissions: DatabasePermission[]
  assignedPermissionIds: string[]
  permissionGroups: ReadonlyArray<PermissionGroup>
}

export function RoleEditor({
  role,
  permissions,
  assignedPermissionIds,
  permissionGroups,
}: RoleEditorProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState(role.name)
  const [description, setDescription] = useState(role.description)

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(assignedPermissionIds),
  )

  const [error, setError] = useState<string | null>(null)

  const permissionByKey = useMemo(
    () => new Map(permissions.map((permission) => [permission.key, permission])),
    [permissions],
  )

  const selectedCount = selected.size

  const editable = role.key !== 'super_admin'

  function togglePermission(permissionId: string) {
    if (!editable || pending) return

    setSelected((current) => {
      const next = new Set(current)

      if (next.has(permissionId)) {
        next.delete(permissionId)
      } else {
        next.add(permissionId)
      }

      return next
    })
  }

  function toggleModule(group: PermissionGroup) {
    if (!editable || pending) return

    const ids = group.permissions
      .map(
        (permission) =>
          permissionByKey.get(
            `${permission.module}.${permission.action}`,
          )?.id,
      )
      .filter((id): id is string => Boolean(id))

    setSelected((current) => {
      const next = new Set(current)
      const allSelected = ids.every((id) => next.has(id))

      for (const id of ids) {
        if (allSelected) {
          next.delete(id)
        } else {
          next.add(id)
        }
      }

      return next
    })
  }

  function save() {
    if (!editable || pending) return

    setError(null)

    startTransition(async () => {
      const result = await updateRole({
        roleId: role.id,
        name: name.trim(),
        description: description.trim(),
        permissionIds: [...selected],
        permissionVersion: role.permissionVersion,
      })

      if (!result.ok) {
        setError(result.error.message)
        return
      }

      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border bg-card p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">
              Nama Role
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!editable || pending}
              className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Role Key
            </label>

            <input
              value={role.key}
              disabled
              className="mt-2 h-10 w-full rounded-lg border bg-muted px-3 text-sm text-muted-foreground"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium">
            Deskripsi
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={!editable || pending}
            rows={3}
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
          />
        </div>

        {role.key === 'super_admin' ? (
          <div className="mt-4 rounded-lg border p-4 text-sm">
            <strong>Super Admin</strong>
            <p className="mt-1 text-muted-foreground">
              Role Super Admin bersifat immutable. Permission, nama, dan deskripsinya
              tidak dapat diubah melalui Role Editor.
            </p>
          </div>
        ) : role.isSystem ? (
          <div className="mt-4 rounded-lg border p-4 text-sm">
            <strong>System Role</strong>
            <p className="mt-1 text-muted-foreground">
              Identitas role system dilindungi. Permission role ini dapat dikelola
              oleh Super Admin.
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border bg-card">
        <div className="border-b p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                Permission
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Checklist permission yang boleh digunakan oleh administrator
                dengan role ini.
              </p>
            </div>

            <div className="rounded-full border px-3 py-1 text-xs font-medium">
              {selectedCount} permission dipilih
            </div>
          </div>
        </div>

        <div className="divide-y">
          {permissionGroups.map((group) => {
            const groupPermissions = group.permissions
              .map((permission) =>
                permissionByKey.get(
                  `${permission.module}.${permission.action}`,
                ),
              )
              .filter(
                (permission): permission is DatabasePermission =>
                  Boolean(permission),
              )

            const selectedInGroup = groupPermissions.filter((permission) =>
              selected.has(permission.id),
            ).length

            const allSelected =
              groupPermissions.length > 0 &&
              selectedInGroup === groupPermissions.length

            return (
              <div key={group.module} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium">
                      {group.label}
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedInGroup}/{groupPermissions.length} aktif
                    </p>
                  </div>

                  {editable ? (
                    <button
                      type="button"
                      onClick={() => toggleModule(group)}
                      disabled={pending}
                      className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                    >
                      {allSelected
                        ? 'Hapus Semua'
                        : 'Pilih Semua'}
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {groupPermissions.map((permission) => {
                    const checked = selected.has(permission.id)

                    return (
                      <label
                        key={permission.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                          checked ? 'bg-muted/50' : ''
                        } ${
                          !editable || pending
                            ? 'cursor-not-allowed opacity-60'
                            : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            togglePermission(permission.id)
                          }
                          disabled={!editable || pending}
                          className="mt-1 size-4"
                        />

                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {permission.action}
                          </span>

                          <span className="mt-0.5 block break-all text-xs text-muted-foreground">
                            {permission.key}
                          </span>

                          <span className="mt-1 block text-xs text-muted-foreground">
                            {permission.description}
                          </span>

                          {permission.is_dangerous ? (
                            <span className="mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium">
                              Permission berbahaya
                            </span>
                          ) : null}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border p-4 text-sm">
          <strong>Gagal menyimpan perubahan</strong>
          <p className="mt-1 text-muted-foreground">
            {error}
          </p>
        </div>
      ) : null}

      {editable ? (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-lg border bg-background px-5 py-3 text-sm font-medium shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      ) : null}
    </div>
  )
}



