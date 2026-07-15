/**
 * PageLayout.jsx — Root app shell
 *
 * Desktop (lg+): Sidebar (fixed 220px left) + TopBar hidden + content offset.
 * Mobile:        TopBar (sticky top) + BottomNav (fixed bottom) — unchanged.
 */
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'

export default function PageLayout({ children }) {
  const location = useLocation()

  return (
    <div className="min-h-dvh bg-background flex flex-col text-text transition-colors duration-300">
      {/* Background gradient orbs — rendered on GPU */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyber-600/10 rounded-full blur-3xl transform-gpu will-change-transform" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl transform-gpu will-change-transform" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl transform-gpu will-change-transform" />
      </div>

      {/* Desktop: fixed sidebar */}
      <Sidebar />

      {/* Mobile-only: sticky TopBar */}
      <div className="lg:hidden">
        <TopBar />
      </div>

      {/* Main content
          - Mobile:  full width, standard padding
          - Desktop: offset by sidebar width (220px) */}
      <main
        className="flex-1 relative z-10 pb-24 lg:pb-6 lg:ml-[220px]"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="max-w-3xl mx-auto px-4 py-4 lg:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="transform-gpu"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile-only: bottom nav */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
