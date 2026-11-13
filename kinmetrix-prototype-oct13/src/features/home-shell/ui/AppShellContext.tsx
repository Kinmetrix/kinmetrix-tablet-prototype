import { createContext, useContext, type ReactNode } from 'react'
import {
  useAppShellController,
  type AppShellController,
} from '../hooks/useAppShellController'

const AppShellContext = createContext<AppShellController | null>(null)

type Props = {
  onOpenAnalysis: () => void
  children: ReactNode
}

export function AppShellProvider({ onOpenAnalysis, children }: Props) {
  const controller = useAppShellController({ onOpenAnalysis })
  return (
    <AppShellContext.Provider value={controller}>{children}</AppShellContext.Provider>
  )
}

export function useAppShell(): AppShellController {
  const context = useContext(AppShellContext)
  if (!context) {
    throw new Error('useAppShell must be used within AppShellProvider')
  }
  return context
}
