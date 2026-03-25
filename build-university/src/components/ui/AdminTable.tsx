'use client'

interface Column<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
}

interface AdminTableProps<T extends { id: string }> {
  columns: Column<T>[]
  rows: T[]
  onEdit?: (row: T) => void
  onDelete?: (id: string) => void
  emptyMessage?: string
}

export default function AdminTable<T extends { id: string }>({
  columns, rows, onEdit, onDelete, emptyMessage = 'No items yet'
}: AdminTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="bg-white/3 border border-white/8 rounded-xl p-8 text-center text-white/30">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8">
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-left text-white/40 font-medium">
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-4 py-3 text-right text-white/40 font-medium w-24">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3 text-right space-x-2">
                  {onEdit && (
                    <button onClick={() => onEdit(row)} className="text-amber-500/70 hover:text-amber-500 text-xs">
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(row.id)} className="text-red-400/50 hover:text-red-400 text-xs">
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
