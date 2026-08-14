import { cn } from '@/lib/cn'

/**
 * Two layers:
 *
 *   • Table primitives — for hand-built tables.
 *   • `DataTable`      — column-driven, and **stacks into definition cards
 *                        below `md`** rather than scrolling horizontally.
 *
 * A horizontally scrolling table is unusable on a phone, and the admin surface
 * has to work on a phone (docs/DESIGN-SYSTEM.md §4).
 */

export function Table({ className, ...props }: React.ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-body-sm', className)} {...props} />
    </div>
  )
}

export function THead({ className, ...props }: React.ComponentPropsWithoutRef<'thead'>) {
  return <thead className={cn('border-b border-border-strong', className)} {...props} />
}

export function TBody({ className, ...props }: React.ComponentPropsWithoutRef<'tbody'>) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />
}

export function TR({ className, ...props }: React.ComponentPropsWithoutRef<'tr'>) {
  return <tr className={cn('transition-colors hover:bg-sunken/60', className)} {...props} />
}

export function TH({
  className,
  align = 'left',
  ...props
}: React.ComponentPropsWithoutRef<'th'> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      scope="col"
      className={cn(
        'px-3 py-2.5 text-overline whitespace-nowrap text-fg-subtle uppercase',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
      {...props}
    />
  )
}

export function TD({
  className,
  align = 'left',
  numeric = false,
  ...props
}: React.ComponentPropsWithoutRef<'td'> & {
  align?: 'left' | 'right' | 'center'
  numeric?: boolean
}) {
  return (
    <td
      className={cn(
        'px-3 py-3 align-middle text-fg',
        numeric && 'font-mono tabular',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* DataTable                                                                  */
/* -------------------------------------------------------------------------- */

export type Column<Row> = {
  /** Stable key, also used as the React key. */
  id: string
  header: React.ReactNode
  cell: (row: Row) => React.ReactNode
  align?: 'left' | 'right' | 'center'
  /** Renders in the monospace tabular face — use for money and counts. */
  numeric?: boolean
  /** Hidden in the stacked mobile layout (e.g. a redundant row-action column). */
  hideOnStack?: boolean
  /** Used as the card title in the stacked layout. Exactly one column should set this. */
  primary?: boolean
  className?: string
}

export type DataTableProps<Row> = {
  columns: ReadonlyArray<Column<Row>>
  rows: readonly Row[]
  rowKey: (row: Row) => string
  /** Shown when `rows` is empty — always pass a real designed state. */
  empty: React.ReactNode
  caption?: string
  onRowClick?: (row: Row) => void
  className?: string
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
  caption,
  onRowClick,
  className,
}: DataTableProps<Row>) {
  if (rows.length === 0) return <>{empty}</>

  const primaryColumn = columns.find((column) => column.primary) ?? columns[0]

  return (
    <div className={className}>
      {/* Tabular layout — md and up */}
      <div className="hidden md:block">
        <Table>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <THead>
            <TR className="hover:bg-transparent">
              {columns.map((column) => (
                <TH key={column.id} align={column.align} className={column.className}>
                  {column.header}
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR
                key={rowKey(row)}
                {...(onRowClick
                  ? {
                      onClick: () => onRowClick(row),
                      className: 'cursor-pointer',
                    }
                  : {})}
              >
                {columns.map((column) => (
                  <TD key={column.id} align={column.align} numeric={column.numeric}>
                    {column.cell(row)}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      {/* Stacked definition cards — below md */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className="rounded-md border border-border bg-surface p-4 text-body-sm"
          >
            {primaryColumn ? (
              <p className="mb-2 text-heading-sm text-fg">{primaryColumn.cell(row)}</p>
            ) : null}
            <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1.5">
              {columns
                .filter((column) => column !== primaryColumn && !column.hideOnStack)
                .map((column) => (
                  <div key={column.id} className="contents">
                    <dt className="text-caption text-fg-subtle">{column.header}</dt>
                    <dd className={cn('text-body-sm text-fg', column.numeric && 'font-mono tabular')}>
                      {column.cell(row)}
                    </dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}
