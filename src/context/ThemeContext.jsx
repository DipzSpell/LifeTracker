import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'system'
  })

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = (currentTheme) => {
      let resolvedTheme = currentTheme

      if (currentTheme === 'system') {
        resolvedTheme = mediaQuery.matches ? 'dark' : 'light'
      }

      root.setAttribute('data-theme', resolvedTheme)
      
      // Also sync standard Tailwind dark class if any library depends on it
      if (resolvedTheme === 'dark' || resolvedTheme === 'synthwave' || resolvedTheme === 'midnight' || resolvedTheme === 'matrix' || resolvedTheme === 'cyberpunk') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyTheme(theme)
    localStorage.setItem('theme', theme)

    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleSystemChange)
    return () => mediaQuery.removeEventListener('change', handleSystemChange)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
