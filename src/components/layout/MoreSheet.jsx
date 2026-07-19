/**
 * MoreSheet.jsx — Mobile "More" bottom sheet
 *
 * Slides up from the bottom (full width, rounded top corners, drag-handle
 * bar) listing the pages that don't fit in the 5-item BottomNav: Daily
 * Log, Fitness, Habits, Tasks, Profile.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Dumbbell, ListChecks, CheckSquare, User, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const SECONDARY_ITEMS = [
  { key: 'log',     path: '/log',     icon: BookOpen,    label: 'Daily Log', sub: 'Log your day' },
  { key: 'fitness', path: '/fitness', icon: Dumbbell,    label: 'Fitness',   sub: 'Workouts & steps' },
  { key: 'habits',  path: '/habits',  icon: ListChecks,  label: 'Habits',    sub: 'Streaks & routines' },
  { key: 'todo',    path: '/todo',    icon: CheckSquare, label: 'Tasks',     sub: 'To-dos & priorities' },
  { key: 'profile', path: '/profile', icon: User,        label: 'Profile',  sub: 'Settings & stats' },
]

export default function MoreSheet({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { settings } = useApp()
  const fitnessEnabled = settings?.fitnessTrackerEnabled !== false

  const items = SECONDARY_ITEMS.filter(i => i.key !== 'fitness' || fitnessEnabled)

  const go = (path) => {
    onClose()
    navigate(path)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto lg:hidden
                       bg-card border-t border-white/10 rounded-t-3xl pb-safe shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-white/20" />
            </div>

            <div className="flex items-center justify-between px-5 pt-1 pb-3">
              <h2 className="text-sm font-bold text-white">More</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center
                           active:scale-90 transition-transform duration-150"
              >
                <X size={15} className="text-white/60" />
              </button>
            </div>

            <div className="px-4 pb-5 grid grid-cols-2 gap-2.5">
              {items.map(({ path, icon: Icon, label, sub }) => (
                <button
                  key={path}
                  id={`more-sheet-${label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => go(path)}
                  className="flex flex-col items-start gap-2 p-3.5 rounded-2xl bg-white/5 border border-white/8
                             min-h-[88px] active:scale-95 transition-transform duration-150 text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-cyan-400/15 flex items-center justify-center flex-shrink-0">
                    <Icon size={17} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white leading-tight">{label}</p>
                    <p className="text-[10px] text-white/35 leading-tight mt-0.5">{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}