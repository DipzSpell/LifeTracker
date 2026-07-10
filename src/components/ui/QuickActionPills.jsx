/**
 * QuickActionPills.jsx — Horizontal scrollable row of pill-shaped action buttons
 *
 * Props:
 *   actions — array of { id, icon (Lucide element or emoji), label, onClick, accentRgb? }
 *   className — optional extra classes on the wrapper
 */
export default function QuickActionPills({ actions = [], className = '' }) {
  if (!actions.length) return null

  return (
    <div className={`flex gap-2 overflow-x-auto no-scrollbar pb-0.5 ${className}`}>
      {actions.map(({ id, icon, label, onClick, accentRgb }) => (
        <button
          key={id}
          id={id}
          onClick={onClick}
          className="quick-pill flex-shrink-0"
          style={
            accentRgb
              ? {
                  background: `rgb(${accentRgb} / 0.12)`,
                  borderColor: `rgb(${accentRgb} / 0.30)`,
                  color: `rgb(${accentRgb})`,
                }
              : undefined
          }
        >
          {typeof icon === 'string'
            ? <span className="text-sm leading-none">{icon}</span>
            : icon
          }
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
