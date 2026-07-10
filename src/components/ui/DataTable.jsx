/**
 * DataTable.jsx — Clean monospace history/log table
 *
 * Props:
 *   columns — array of { key, label, render?: (value, row) => ReactNode }
 *   rows    — array of data objects
 *   emptyMessage — shown when rows is empty
 *   className — optional wrapper class
 */
export default function DataTable({ columns = [], rows = [], emptyMessage = 'No data yet.', className = '' }) {
  return (
    <div className={`w-full overflow-x-auto rounded-xl bg-white/[0.02] border border-white/6 ${className}`}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-6 text-center text-white/30 font-mono text-xs">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? i}>
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
