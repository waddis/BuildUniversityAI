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
      <div className="bg-[#201f1f] rounded-xl p-8 text-center text-[#e5e2e1]/30" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="bg-[#201f1f] rounded-xl overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ boxShadow: 'inset 0 -1px 0 rgba(86,67,52,0.15)' }}>
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-left text-[#e5e2e1]/40 font-medium">
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-4 py-3 text-right text-[#e5e2e1]/40 font-medium w-24">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-[#2a2a2a] transition-colors" style={{ boxShadow: 'inset 0 -1px 0 rgba(86,67,52,0.08)' }}>
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3 text-right space-x-2">
                  {onEdit && (
                    <button onClick={() => onEdit(row)} className="text-[#FF8C00]/70 hover:text-[#FF8C00] text-xs">
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
