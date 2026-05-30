import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { useState, useCallback, useRef } from 'react'

const ICONS = {
  success: <CheckCircle size={18} className="text-emerald-400" />,
  error: <AlertCircle size={18} className="text-red-400" />,
  info: <Info size={18} className="text-cyber-400" />,
}

const COLORS = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-cyber-500/30 bg-cyber-500/10',
}

export default function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 max-w-xs w-full">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`flex items-start gap-3 p-3 rounded-xl border backdrop-blur-xl shadow-lg ${COLORS[toast.type] || COLORS.info}`}
          >
            <div className="flex-shrink-0 mt-0.5">{ICONS[toast.type] || ICONS.info}</div>
            <p className="flex-1 text-sm text-white leading-snug">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-white/40 hover:text-white/70 transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Toast hook
export function useToast() {
  const [toasts, setToasts] = useState([])
  const timerRef = useRef({})

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    timerRef.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      delete timerRef.current[id]
    }, duration)
    return id
  }, [])

  const removeToast = useCallback((id) => {
    clearTimeout(timerRef.current[id])
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}
