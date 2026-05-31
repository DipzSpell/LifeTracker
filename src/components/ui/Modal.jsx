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
          {/* Modal Centering Wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`relative flex flex-col max-h-[85vh] w-full ${sizeMap[size] || 'max-w-md'} bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden window-safe`}
            >
              {/* Header */}
              <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">{title}</h2>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center
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
                <div className="flex-shrink-0 p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-3 sticky bottom-0">
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
