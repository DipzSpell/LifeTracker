import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', full: 'max-w-full mx-4' }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          {/* Modal wrapper — bottom sheet on mobile, centered card on sm+ */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`relative flex flex-col max-h-[88vh] sm:max-h-[85vh] w-full ${sizeMap[size] || 'max-w-md'}
                          bg-card border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden window-safe`}
            >
              {/* Drag handle — mobile bottom-sheet only */}
              <div className="sm:hidden flex justify-center pt-2.5 pb-0.5 flex-shrink-0">
                <div className="w-10 h-1.5 rounded-full bg-white/20" />
              </div>
              {/* Header */}
              <div className="flex-shrink-0 px-6 pt-3 sm:pt-5 pb-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">{title}</h2>
                  <button
                    onClick={onClose}
                    className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-white/5 flex items-center justify-center
                               hover:bg-white/10 transition-all duration-200 active:scale-90"
                  >
                    <X size={16} className="text-white/60" />
                  </button>
                </div>
              </div>
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                {children}
              </div>
              {/* Footer */}
              {footer && (
                <div className="flex-shrink-0 p-4 pb-safe border-t border-white/5 bg-card flex items-center justify-between gap-3 sticky bottom-0">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
