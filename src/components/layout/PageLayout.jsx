import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

export default function PageLayout({ children }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyber-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl" />
      </div>

      <TopBar />

      {/* Main content */}
      <main className="flex-1 relative z-10 pb-24">
        <div className="max-w-lg mx-auto px-4 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
