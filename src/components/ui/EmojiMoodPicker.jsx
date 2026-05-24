import { motion } from 'framer-motion'

const MOODS = [
  { val: 1, emoji: '😭', label: 'Awful' },
  { val: 2, emoji: '😢', label: 'Bad' },
  { val: 3, emoji: '😟', label: 'Low' },
  { val: 4, emoji: '😐', label: 'Meh' },
  { val: 5, emoji: '🙂', label: 'OK' },
  { val: 6, emoji: '😊', label: 'Good' },
  { val: 7, emoji: '😄', label: 'Great' },
  { val: 8, emoji: '😁', label: 'Awesome' },
  { val: 9, emoji: '🤩', label: 'Amazing' },
  { val: 10, emoji: '🥳', label: 'Perfect' },
]

export default function EmojiMoodPicker({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-white/60">
          {value ? MOODS[value - 1]?.label : 'Select mood'}
        </span>
        {value && (
          <span className="text-2xl">{MOODS[value - 1]?.emoji}</span>
        )}
      </div>
      <div className="flex gap-1 justify-between">
        {MOODS.map(({ val, emoji }) => (
          <motion.button
            key={val}
            id={`mood-${val}`}
            onClick={() => onChange(val)}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.85 }}
            className={`mood-btn ${value === val ? 'selected' : 'opacity-60 hover:opacity-100'}`}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
      {/* Scale labels */}
      <div className="flex justify-between text-[10px] text-white/30 px-1">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  )
}
